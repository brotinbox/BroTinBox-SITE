export const isTestOrderId = (id: string) => /^CFTEST-[A-Z0-9]{4,20}$/.test(id);
