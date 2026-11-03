-- The pause FAQ promised a cash-style "account balance"; the policy is meal credits
-- that extend the plan end date and have no cash value (see /terms and /refund-policy).
update public.faqs set answer = 'Yes! You can pause your plan with one tap under "My plan" or via WhatsApp. Paused or skipped meals become meal credits and your end date moves out by the same number of delivery days, so you do not lose them.'
where question = 'Can I pause my subscription if I am travelling out of Coimbatore?';
