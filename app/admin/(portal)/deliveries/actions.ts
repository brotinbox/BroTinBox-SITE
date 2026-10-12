'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';

const STATUSES = ['locked', 'preparing', 'packed', 'out_for_delivery', 'delivered', 'failed'] as const;

export async function bulkUpdate(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ids = z.array(z.string().uuid()).min(1).max(500).safeParse(fd.getAll('ids'));
  const status = z.enum(STATUSES).safeParse(fd.get('status'));
  const rider = z.string().uuid().or(z.literal('')).safeParse(fd.get('rider_id') ?? '');
  if (!ids.success) return fail('Select at least one delivery.');
  return staffAction('deliveries.write', async () => {
    const supabase = await getSupabaseServer();
    if (rider.success && rider.data) {
      const { error } = await supabase.rpc('assign_rider', { p_delivery_ids: ids.data, p_rider: rider.data });
      if (error) throw error;
    }
    if (status.success) {
      for (const id of ids.data) {
        const { error } = await supabase.rpc('update_delivery_status', { p_delivery: id, p_status: status.data });
        if (error) throw error;
      }
    }
    return ok(`Updated ${ids.data.length} deliveries.`);
  });
}
