import { requireStaff } from '@/lib/auth/session';
import { Card, EmptyState, PageHeader } from '@/components/admin/ui';
import { ActionForm, Field, Input, SubmitButton } from '@/components/admin/forms';
import { StockNav, StockNotReady, isMissingTable } from '@/components/admin/stock/StockNav';
import { getIngredients, recipeNames, type StockIngredient } from '@/lib/stock/server';
import { INPUT_UNITS, STOCK_CATEGORIES, fmtPrice, type BaseUnit } from '@/lib/stock/units';
import { linkAlias, saveIngredient } from '../actions';

export const metadata = { title: 'Stock items' };

const sel = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900';

/**
 * The things we buy (fresh or stock, unit, pack size) and which recipe
 * ingredient names count as which item.
 */
export default async function StockIngredientsPage() {
  const staff = await requireStaff('stock.read');
  const canWrite = staff.can('stock.write');

  let ingredients: StockIngredient[];
  let names: Awaited<ReturnType<typeof recipeNames>>;
  try {
    [ingredients, names] = await Promise.all([getIngredients(), recipeNames()]);
  } catch (e) {
    if (isMissingTable(e)) return (<><PageHeader title="Stock items" /><StockNotReady /></>);
    throw e;
  }
  const unlinked = names.filter((n) => n.ingredientId === undefined);
  const options = (
    <>
      <option value="">Pick a stock item…</option>
      <option value="ignore">Not tracked (water…)</option>
      {STOCK_CATEGORIES.map((c) => (
        <optgroup key={c.value} label={c.label}>
          {ingredients.filter((i) => i.category === c.value && i.is_active).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </optgroup>
      ))}
    </>
  );

  return (
    <>
      <PageHeader
        title="Stock items & recipe links"
        description="Fresh = bought for tomorrow’s cooking. Stock = bought in packs and kept; it shows on the buy list when less than 5 cooking days are left."
      />
      <StockNav active="/stock/ingredients" />

      <Card title={`Recipe ingredients not linked (${unlinked.length})`} className="mb-4">
        {unlinked.length === 0 ? (
          <p className="text-sm text-gray-600">Every ingredient written in the recipes counts as a stock item. When a recipe gets a new ingredient name (like mint added to a dish), it shows up here to link.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">These are left out of the buy list until linked. Add the item below first if it’s new.</p>
            {unlinked.map((n) => (
              <ActionForm key={n.key} action={linkAlias} className="grid sm:grid-cols-[1fr_16rem_auto] gap-2 items-center">
                <input type="hidden" name="alias" value={n.name} />
                <div><p className="text-sm font-semibold text-gray-900">{n.name}</p><p className="text-[11px] text-gray-500">in {n.dishes.join(', ')}</p></div>
                {canWrite && <select name="ingredient_id" required className={sel}>{options}</select>}
                {canWrite && <SubmitButton variant="secondary">Link</SubmitButton>}
              </ActionForm>
            ))}
          </div>
        )}
      </Card>

      <div className="grid max-md:grid-cols-[minmax(0,1fr)] lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {STOCK_CATEGORIES.map((c) => {
            const rows = ingredients.filter((i) => i.category === c.value);
            if (!rows.length) return null;
            return (
              <Card key={c.value} title={c.label} padded={false}>
                <div className="divide-y divide-gray-100">
                  {rows.map((i) => (
                    <details key={i.id} className="group">
                      <summary className="flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer list-none">
                        <span className="min-w-0">
                          <span className={`text-sm font-semibold ${i.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{i.name}</span>
                          <span className="block text-[11px] text-gray-500">
                            {i.kind === 'fresh' ? 'Fresh' : `Stock${i.pack_size ? ` · pack ${packLabel(i)}` : ''}`} · in {i.unit} · {fmtPrice(i.price_per_unit, i.unit)}
                          </span>
                        </span>
                        <span className="text-xs font-bold text-primary group-open:hidden">{canWrite ? 'Edit' : 'Links'}</span>
                      </summary>
                      <div className="px-4 pb-4">
                        {canWrite && <IngredientForm ing={i} />}
                        <Links names={names.filter((n) => n.ingredientId === i.id)} />
                      </div>
                    </details>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
        <div className="space-y-4">
          {canWrite && (
            <Card title="Add a stock item" className="self-start">
              <IngredientForm />
            </Card>
          )}
          <Card title="Not tracked">
            <p className="text-xs text-gray-600 mb-2">Recipe names that are left out on purpose:</p>
            <ul className="text-xs text-gray-700 space-y-1">
              {names.filter((n) => n.ingredientId === null).map((n) => (
                <li key={n.key} className="flex items-center justify-between gap-2">
                  <span>{n.name}</span>
                  {canWrite && (
                    <ActionForm action={linkAlias}>
                      <input type="hidden" name="alias" value={n.name} />
                      <input type="hidden" name="ingredient_id" value="" />
                      <SubmitButton variant="secondary" pendingText="…">Unlink</SubmitButton>
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          {canWrite && (
            <Card title="Link a name by hand">
              <ActionForm action={linkAlias} resetOnSuccess className="space-y-3">
                <Field label="Recipe ingredient name" hint="Exactly as written in the recipe"><Input name="alias" required maxLength={80} /></Field>
                <Field label="Counts as"><select name="ingredient_id" required className={sel}>{options}</select></Field>
                <SubmitButton className="w-full">Link</SubmitButton>
              </ActionForm>
              <p className="text-[11px] text-gray-500 mt-2">Linked: {names.filter((n) => n.ingredientId).length} of {names.length} recipe names ({names.filter((n) => n.ingredientId === null).length} not tracked).</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function packLabel(i: StockIngredient) {
  if (!i.pack_size) return '';
  const big = INPUT_UNITS[i.unit][0];
  return i.unit !== 'pcs' && i.pack_size >= big.factor ? `${i.pack_size / big.factor} ${big.unit}` : `${i.pack_size} ${i.unit}`;
}

function Links({ names }: { names: { name: string; key: string; dishes: string[] }[] }) {
  if (!names.length) return <p className="text-[11px] text-gray-500 mt-2">No recipe uses this yet.</p>;
  return (
    <div className="mt-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Recipe names counted as this</p>
      <ul className="text-xs text-gray-700 space-y-0.5">
        {names.map((n) => <li key={n.key}>{n.name} <span className="text-gray-400">({n.dishes.join(', ')})</span></li>)}
      </ul>
    </div>
  );
}

function IngredientForm({ ing }: { ing?: StockIngredient }) {
  const unit: BaseUnit = ing?.unit ?? 'g';
  const big = INPUT_UNITS[unit][0];
  const inBig = (q: number | null) => (q === null ? '' : unit === 'pcs' ? String(q) : String(q / big.factor));
  return (
    <ActionForm action={saveIngredient} resetOnSuccess={!ing} className="space-y-3">
      {ing && <input type="hidden" name="id" value={ing.id} />}
      <Field label="Name"><Input name="name" defaultValue={ing?.name} required maxLength={60} placeholder="e.g. Mint leaves" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type">
          <select name="kind" defaultValue={ing?.kind ?? 'fresh'} className={sel}>
            <option value="fresh">Fresh (buy for each day)</option>
            <option value="pantry">Stock (buy packs, keep)</option>
          </select>
        </Field>
        <Field label="Counted in">
          <select name="unit" defaultValue={unit} className={sel}>
            <option value="g">weight (g / kg)</option>
            <option value="ml">liquid (ml / L)</option>
            <option value="pcs">pieces</option>
          </select>
        </Field>
      </div>
      <Field label="Shop section">
        <select name="category" defaultValue={ing?.category ?? 'vegetables'} className={sel}>
          {STOCK_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-[1fr_5rem] gap-2">
        <Field label="Pack size" hint="Stock items: one pack you usually buy"><Input name="pack_size" type="number" step="any" min="0" defaultValue={inBig(ing?.pack_size ?? null)} /></Field>
        <Field label="Unit"><select name="pack_unit" defaultValue={big.unit} className={sel}>{['kg', 'g', 'L', 'ml', 'pcs'].map((u) => <option key={u} value={u}>{u}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-[1fr_5rem] gap-2">
        <Field label="Never below" hint="Optional minimum to keep"><Input name="min_stock" type="number" step="any" min="0" defaultValue={inBig(ing?.min_stock ?? null)} /></Field>
        <Field label="Unit"><select name="min_unit" defaultValue={big.unit} className={sel}>{['kg', 'g', 'L', 'ml', 'pcs'].map((u) => <option key={u} value={u}>{u}</option>)}</select></Field>
      </div>
      <Field label="Note" hint="Optional"><Input name="note" defaultValue={ing?.note ?? ''} maxLength={200} placeholder="e.g. 1 lemon ≈ 30 ml juice" /></Field>
      {ing && (
        <label className="inline-flex items-center gap-2 text-sm text-gray-800">
          <input type="hidden" name="is_active" value="off" />
          <input type="checkbox" name="is_active" value="on" defaultChecked={ing.is_active} className="w-4 h-4" /> In use
        </label>
      )}
      <SubmitButton className="w-full">{ing ? 'Save' : 'Add item'}</SubmitButton>
    </ActionForm>
  );
}
