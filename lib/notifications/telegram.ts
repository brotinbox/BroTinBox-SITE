import 'server-only';
import { BRAND } from '@/config/brand';
import { getSupabaseService } from '@/lib/supabase/admin';

/**
 * Escapes characters for Telegram HTML parse_mode.
 */
function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const inr = (n: number | string) =>
  `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/**
 * Core function to send an HTML-formatted message to the Telegram chat.
 * Fails gracefully without throwing to prevent breaking customer flows.
 */
export async function sendTelegramMessage(htmlText: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment.');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Telegram] API error:', res.status, errText);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Telegram] Failed to send message:', err);
    return false;
  }
}

/**
 * Sends a rich Telegram notification when a customer places an order.
 */
export async function notifyOrderPlaced(orderId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseService();

    // 1. Fetch order details
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_number, user_id, type, status, total, subtotal, discount, delivery_fee, address_snapshot, pricing_snapshot, created_at')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      console.error('[Telegram] Could not fetch order for notification:', orderErr);
      return false;
    }

    // 2. Fetch customer profile and items in parallel
    const [{ data: profile }, { data: items }] = await Promise.all([
      supabase.from('profiles').select('full_name, phone, email').eq('id', order.user_id).maybeSingle(),
      supabase.from('order_items').select('name, qty, unit_price, total, item_type').eq('order_id', orderId),
    ]);

    const addr = (order.address_snapshot ?? {}) as {
      recipient_name?: string;
      phone?: string;
      flat?: string;
      street?: string;
      landmark?: string;
      area?: string;
      pincode?: string;
      city?: string;
      instructions?: string;
    };

    const customerName = addr.recipient_name || profile?.full_name || 'Customer';
    const customerPhone = addr.phone || profile?.phone || '';
    const phoneDigits = customerPhone.replace(/\D/g, '').slice(-10);

    // Build address string
    const addressParts = [
      addr.flat,
      addr.street,
      addr.landmark ? `(near ${addr.landmark})` : null,
      addr.area,
      addr.city || 'Coimbatore',
      addr.pincode,
    ].filter(Boolean);
    const addressText = addressParts.length ? addressParts.join(', ') : 'Not recorded';

    // Format items list
    const itemsList = (items && items.length > 0)
      ? items.map((i) => `  • ${escapeHtml(i.name)}${i.qty > 1 ? ` × ${i.qty}` : ''} (<b>${inr(i.total)}</b>)`).join('\n')
      : '  • Standard Plan Box';

    // Pricing snapshot schedule info if present
    const pricing = order.pricing_snapshot as { schedule?: Array<{ date: string; diet: string }> } | null;
    const scheduleCount = pricing?.schedule?.length ?? 0;
    const firstDate = pricing?.schedule?.[0]?.date;
    const dietType = pricing?.schedule?.[0]?.diet;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://brotinbox.com';
    const adminPath = process.env.ADMIN_PATH || 'admin';
    const adminUrl = `${siteUrl}/${adminPath}/orders`;

    const now = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const lines: string[] = [
      `🍱 <b>NEW ORDER RECEIVED · ${escapeHtml(BRAND.name)}</b>`,
      '',
      `🧾 <b>Order:</b> <code>#${escapeHtml(order.order_number)}</code>`,
      `💰 <b>Total:</b> <b>${inr(order.total)}</b>${Number(order.discount) > 0 ? ` <i>(Discount: -${inr(order.discount)})</i>` : ''}`,
      `📦 <b>Plan Type:</b> ${escapeHtml(order.type?.toUpperCase() || 'TRIAL')}${dietType ? ` (${escapeHtml(dietType)})` : ''}`,
      scheduleCount > 0 ? `📅 <b>Schedule:</b> ${scheduleCount} day${scheduleCount > 1 ? 's' : ''}${firstDate ? ` · starts ${escapeHtml(firstDate)}` : ''}` : '',
      '',
      `👤 <b>Customer:</b> ${escapeHtml(customerName)}`,
      customerPhone ? `📱 <b>Phone:</b> ${escapeHtml(customerPhone)}` : '',
      `📍 <b>Delivery Address:</b>\n${escapeHtml(addressText)}`,
      addr.instructions ? `📝 <i>Note: ${escapeHtml(addr.instructions)}</i>` : '',
      '',
      `🍽️ <b>Order Items:</b>\n${itemsList}`,
      '',
      phoneDigits ? `💬 <a href="https://wa.me/91${phoneDigits}">Chat with Customer on WhatsApp</a>` : '',
      `🔗 <a href="${adminUrl}">Open in Admin Orders Portal</a>`,
      `🕒 <i>${now} IST</i>`,
    ];

    const message = lines.filter(Boolean).join('\n');
    return await sendTelegramMessage(message);
  } catch (err) {
    console.error('[Telegram] notifyOrderPlaced unexpected error:', err);
    return false;
  }
}

/**
 * Sends a Telegram notification when a customer submits a UPI payment reference (UTR).
 */
export async function notifyPaymentReferenceSubmitted(orderId: string, reference: string): Promise<boolean> {
  try {
    const supabase = getSupabaseService();

    const { data: order } = await supabase
      .from('orders')
      .select('id, order_number, user_id, total, address_snapshot')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', order.user_id)
      .maybeSingle();

    const addr = (order.address_snapshot ?? {}) as { recipient_name?: string; phone?: string };
    const customerName = addr.recipient_name || profile?.full_name || 'Customer';
    const customerPhone = addr.phone || profile?.phone || '';
    const phoneDigits = customerPhone.replace(/\D/g, '').slice(-10);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://brotinbox.com';
    const adminPath = process.env.ADMIN_PATH || 'admin';
    const adminUrl = `${siteUrl}/${adminPath}/orders`;

    const now = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const lines: string[] = [
      `💳 <b>UPI PAYMENT REFERENCE SUBMITTED</b>`,
      '',
      `🧾 <b>Order:</b> <code>#${escapeHtml(order.order_number)}</code>`,
      `💰 <b>Amount:</b> <b>${inr(order.total)}</b>`,
      `🔢 <b>UPI UTR / Reference:</b> <code>${escapeHtml(reference)}</code>`,
      '',
      `👤 <b>Customer:</b> ${escapeHtml(customerName)}`,
      customerPhone ? `📱 <b>Phone:</b> ${escapeHtml(customerPhone)}` : '',
      phoneDigits ? `💬 <a href="https://wa.me/91${phoneDigits}?text=Hi%20${encodeURIComponent(customerName)},%20we%20have%20received%20your%20payment%20for%20order%20${encodeURIComponent(order.order_number)}!">Confirm via WhatsApp</a>` : '',
      `🔗 <a href="${adminUrl}">Verify & Confirm in Admin</a>`,
      `🕒 <i>${now} IST</i>`,
    ];

    const message = lines.filter(Boolean).join('\n');
    return await sendTelegramMessage(message);
  } catch (err) {
    console.error('[Telegram] notifyPaymentReferenceSubmitted unexpected error:', err);
    return false;
  }
}

/**
 * Sends a Telegram notification when Cashfree confirms an online payment.
 */
export async function notifyOrderPaid(orderId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseService();
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_number, total, type, address_snapshot')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) return false;

    const addr = (order.address_snapshot ?? {}) as { recipient_name?: string; phone?: string };
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://brotinbox.com';
    const adminPath = process.env.ADMIN_PATH || 'admin';
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

    const lines: string[] = [
      `✅ <b>PAYMENT RECEIVED (CASHFREE)</b>`,
      '',
      `🧾 <b>Order:</b> <code>#${escapeHtml(order.order_number)}</code> · ${escapeHtml(order.type)}`,
      `💰 <b>Amount:</b> <b>${inr(order.total)}</b>`,
      addr.recipient_name ? `👤 <b>Customer:</b> ${escapeHtml(addr.recipient_name)}` : '',
      addr.phone ? `📱 <b>Phone:</b> ${escapeHtml(addr.phone)}` : '',
      `🔗 <a href="${siteUrl}/${adminPath}/orders/${order.id}">Open in Admin</a>`,
      `🕒 <i>${now} IST</i>`,
    ];
    return await sendTelegramMessage(lines.filter(Boolean).join('\n'));
  } catch (err) {
    console.error('[Telegram] notifyOrderPaid unexpected error:', err);
    return false;
  }
}
