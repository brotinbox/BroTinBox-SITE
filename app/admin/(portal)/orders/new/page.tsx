import { requireStaff } from '@/lib/auth/session';
import { Card, PageHeader } from '@/components/admin/ui';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/admin/forms';
import { createManualOrder } from '../actions';

export const metadata = { title: 'New WhatsApp order' };

export default async function NewManualOrderPage() {
  await requireStaff('orders.write');

  return (
    <>
      <PageHeader
        title="New WhatsApp order"
        description="For customers who order by chat or phone. Creates their account, address and plan; prices come from Plans & pricing, same as the website."
      />

      <ActionForm action={createManualOrder} className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          <Card title="1 · Customer">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Name"><Input name="name" required minLength={2} maxLength={80} /></Field>
              <Field label="WhatsApp number" hint="10 digits. An existing customer with this number is reused.">
                <Input name="phone" required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} placeholder="98XXXXXXXX" />
              </Field>
              <Field label="Gmail (optional)" hint="If given, they can later sign in with Google and see this plan.">
                <Input name="email" type="email" maxLength={120} />
              </Field>
            </div>
          </Card>

          <Card title="2 · Delivery address">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Flat / house no."><Input name="flat" required maxLength={120} /></Field>
              <Field label="Street"><Input name="street" required minLength={2} maxLength={160} /></Field>
              <Field label="Area"><Input name="area" required minLength={2} maxLength={80} /></Field>
              <Field label="Pincode" hint="Must be an active delivery zone.">
                <Input name="pincode" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} />
              </Field>
              <Field label="Landmark (optional)"><Input name="landmark" maxLength={120} /></Field>
            </div>
          </Card>

          <Card title="3 · Plan">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Plan">
                <Select name="type" defaultValue="trial" options={[
                  { value: 'trial', label: 'Trial (1 day)' },
                  { value: 'weekly', label: 'Weekly (6 days)' },
                  { value: 'monthly', label: 'Monthly (26 days)' },
                ]} />
              </Field>
              <Field label="Diet">
                <Select name="diet" defaultValue="non_veg" options={[
                  { value: 'non_veg', label: 'Non-veg' },
                  { value: 'veg', label: 'Veg' },
                ]} />
              </Field>
              <Field label="Meals">
                <Select name="meals" defaultValue="lunch" options={[
                  { value: 'lunch', label: 'Lunch only' },
                  { value: 'dinner', label: 'Dinner only' },
                  { value: 'both', label: 'Lunch + dinner' },
                ]} />
              </Field>
              <Field label="Start date (optional)" hint="Blank = earliest day still open. Sundays and closures are skipped.">
                <Input name="start" type="date" />
              </Field>
            </div>
          </Card>
        </div>

        <Card title="4 · Payment">
          <div className="space-y-3">
            <Field label="Status" hint="“Not paid yet” creates the order so you can send the exact total. Mark it paid from the order page later.">
              <Select name="payment" defaultValue="unpaid" options={[
                { value: 'unpaid', label: 'Not paid yet' },
                { value: 'upi', label: 'Paid by UPI' },
                { value: 'cash', label: 'Paid in cash' },
                { value: 'bank_transfer', label: 'Paid by bank transfer' },
              ]} />
            </Field>
            <Field label="UPI / transaction reference" hint="Needed if already paid (not for cash).">
              <Input name="reference" maxLength={60} />
            </Field>
            <SubmitButton pendingText="Creating…" className="w-full">Create order</SubmitButton>
          </div>
        </Card>
      </ActionForm>
    </>
  );
}
