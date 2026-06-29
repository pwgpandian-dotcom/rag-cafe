'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { rupees } from '@/lib/format'
import type { Employer, Outlet, MenuItem, OutletKind, VegType } from '@/types/db'

// ---- constants ----

const KIND_OPTS: { value: OutletKind; label: string }[] = [
  { value: 'FOOD',   label: 'Food'   },
  { value: 'JUICE',  label: 'Juice'  },
  { value: 'COFFEE', label: 'Coffee' },
  { value: 'OTHER',  label: 'Other'  },
]

const VEG_OPTS: { value: VegType; label: string }[] = [
  { value: 'VEG',    label: 'Veg'     },
  { value: 'NONVEG', label: 'Non-Veg' },
  { value: 'EGG',    label: 'Egg'     },
]

const VEG_DOT: Record<VegType, string> = {
  VEG:    'bg-green-500',
  NONVEG: 'bg-red-500',
  EGG:    'bg-yellow-400',
}

// ---- money helpers ----

function toPaise(s: string) {
  const n = parseFloat(s)
  return isNaN(n) ? 0 : Math.round(n * 100)
}

function toRupeeStr(p: number) {
  return String(Math.round(p / 100))
}

// ---- shared UI primitives ----

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent focus:bg-white transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
      <div className="w-10 h-10 text-gray-200 mb-1">{icon}</div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  )
}

function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 rounded-xl" />
      ))}
    </div>
  )
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 border border-red-100">{msg}</p>
  )
}

interface ModalProps {
  title: string
  onClose: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  saving: boolean
  error: string | null
  children: React.ReactNode
}

function Modal({ title, onClose, onSubmit, saving, error, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="px-5 py-4 space-y-4">
            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                {error}
              </p>
            )}
            {children}
          </div>
          <div className="px-5 pb-5 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-brand hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 text-white rounded-full py-3 text-sm font-semibold transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---- icon SVGs ----

const BuildingIcon = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
)

const StoreIcon = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
  </svg>
)

const MenuIcon = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
  </svg>
)

const PinIcon = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

// ---- main component ----

type View = 'companies' | 'sections' | 'items'

export default function ManageTab() {
  const supabase = useMemo(() => createClient(), [])
  const [view, setView] = useState<View>('companies')

  // ── Employers — shared across all views ──
  const [employers, setEmployers]   = useState<Employer[]>([])
  const [empLoading, setEmpLoading] = useState(true)
  const [empError, setEmpError]     = useState<string | null>(null)
  const [editEmp, setEditEmp]       = useState<Employer | 'new' | null>(null)
  const [empSaving, setEmpSaving]   = useState(false)
  const [empFormErr, setEmpFormErr] = useState<string | null>(null)

  // ── Sections view ──
  const [sectEmpId, setSectEmpId]   = useState('')
  const [outlets, setOutlets]       = useState<Outlet[]>([])
  const [outLoading, setOutLoading] = useState(false)
  const [outError, setOutError]     = useState<string | null>(null)
  const [editOut, setEditOut]       = useState<Outlet | 'new' | null>(null)
  const [outSaving, setOutSaving]   = useState(false)
  const [outFormErr, setOutFormErr] = useState<string | null>(null)

  // ── Items view ──
  const [itemEmpId, setItemEmpId]     = useState('')
  const [itemOutlets, setItemOutlets] = useState<Outlet[]>([])
  const [itemOutId, setItemOutId]     = useState('')
  const [items, setItems]             = useState<MenuItem[]>([])
  const [itemLoading, setItemLoading] = useState(false)
  const [itemError, setItemError]     = useState<string | null>(null)
  const [editItem, setEditItem]       = useState<MenuItem | 'new' | null>(null)
  const [itemSaving, setItemSaving]   = useState(false)
  const [itemFormErr, setItemFormErr] = useState<string | null>(null)

  // ── Load employers on mount (shared) ──
  const loadEmployers = useCallback(async () => {
    setEmpLoading(true)
    setEmpError(null)
    const { data, error } = await supabase
      .from('employers')
      .select('id, name, employer_code, default_monthly_credit_paise, status')
      .order('name')
    if (error) setEmpError('Failed to load companies.')
    else setEmployers((data ?? []) as Employer[])
    setEmpLoading(false)
  }, [supabase])

  useEffect(() => { loadEmployers() }, [loadEmployers])

  // ── Load outlets when employer is selected in sections view ──
  useEffect(() => {
    if (!sectEmpId) { setOutlets([]); return }
    let active = true
    setOutLoading(true)
    setOutError(null)
    supabase
      .from('outlets')
      .select('*')
      .eq('employer_id', sectEmpId)
      .order('sort')
      .then(({ data, error }) => {
        if (!active) return
        if (error) setOutError('Failed to load sections.')
        else setOutlets((data ?? []) as Outlet[])
        setOutLoading(false)
      })
    return () => { active = false }
  }, [sectEmpId, supabase])

  // ── Load outlets when employer is selected in items view ──
  useEffect(() => {
    if (!itemEmpId) { setItemOutlets([]); setItemOutId(''); return }
    supabase
      .from('outlets')
      .select('*')
      .eq('employer_id', itemEmpId)
      .order('sort')
      .then(({ data }) => {
        setItemOutlets((data ?? []) as Outlet[])
        setItemOutId('')
      })
  }, [itemEmpId, supabase])

  // ── Load menu items when outlet is selected ──
  useEffect(() => {
    if (!itemOutId) { setItems([]); return }
    let active = true
    setItemLoading(true)
    setItemError(null)
    supabase
      .from('menu_items')
      .select('*')
      .eq('outlet_id', itemOutId)
      .order('sort')
      .then(({ data, error }) => {
        if (!active) return
        if (error) setItemError('Failed to load menu items.')
        else setItems((data ?? []) as MenuItem[])
        setItemLoading(false)
      })
    return () => { active = false }
  }, [itemOutId, supabase])

  // ── CRUD: employers ──
  async function saveEmployer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name          = (fd.get('name') as string).trim()
    const employer_code = (fd.get('employer_code') as string).trim().toUpperCase()
    const credit        = fd.get('credit_rupees') as string
    if (!name || !employer_code) {
      setEmpFormErr('Name and employer code are required.')
      return
    }
    setEmpSaving(true)
    setEmpFormErr(null)
    const payload = {
      name,
      employer_code,
      default_monthly_credit_paise: toPaise(credit),
    }
    const { error } = editEmp === 'new'
      ? await supabase.from('employers').insert(payload)
      : await supabase.from('employers').update(payload).eq('id', (editEmp as Employer).id)
    if (error) {
      setEmpFormErr(
        error.message.toLowerCase().includes('unique')
          ? 'That employer code is already taken.'
          : error.message,
      )
    } else {
      setEditEmp(null)
      await loadEmployers()
    }
    setEmpSaving(false)
  }

  // ── CRUD: outlets ──
  async function saveOutlet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd   = new FormData(e.currentTarget)
    const name = (fd.get('name') as string).trim()
    const kind = fd.get('kind') as OutletKind
    if (!name) { setOutFormErr('Name is required.'); return }
    setOutSaving(true)
    setOutFormErr(null)
    const { error } = editOut === 'new'
      ? await supabase.from('outlets').insert({ name, kind, employer_id: sectEmpId })
      : await supabase.from('outlets').update({ name, kind }).eq('id', (editOut as Outlet).id)
    if (error) {
      setOutFormErr(error.message)
    } else {
      setEditOut(null)
      const { data } = await supabase.from('outlets').select('*').eq('employer_id', sectEmpId).order('sort')
      setOutlets((data ?? []) as Outlet[])
    }
    setOutSaving(false)
  }

  // ── CRUD: menu items ──
  async function saveItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd          = new FormData(e.currentTarget)
    const name        = (fd.get('name') as string).trim()
    const veg         = fd.get('veg') as VegType
    const price       = fd.get('price_rupees') as string
    const description = ((fd.get('description') as string) ?? '').trim() || null
    if (!name || !price) { setItemFormErr('Name and price are required.'); return }
    setItemSaving(true)
    setItemFormErr(null)
    const price_paise = toPaise(price)
    const { error } = editItem === 'new'
      ? await supabase.from('menu_items').insert({
          name, veg, description, price_paise,
          outlet_id: itemOutId, employer_id: itemEmpId,
          is_available: true,
        })
      : await supabase.from('menu_items')
          .update({ name, veg, description, price_paise })
          .eq('id', (editItem as MenuItem).id)
    if (error) {
      setItemFormErr(error.message)
    } else {
      setEditItem(null)
      const { data } = await supabase.from('menu_items').select('*').eq('outlet_id', itemOutId).order('sort')
      setItems((data ?? []) as MenuItem[])
    }
    setItemSaving(false)
  }

  async function toggleAvailability(item: MenuItem) {
    const next = !item.is_available
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: next } : i))
    await supabase.from('menu_items').update({ is_available: next }).eq('id', item.id)
  }

  // ── Derived ──
  const selectedSectEmp = employers.find(e => e.id === sectEmpId)
  const selectedItemOut = itemOutlets.find(o => o.id === itemOutId)

  const selectCls =
    'text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand'

  // ── Render ──
  return (
    <section>
      {/* Sub-nav */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {(['companies', 'sections', 'items'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {v === 'companies' ? 'Companies' : v === 'sections' ? 'Sections' : 'Menu Items'}
          </button>
        ))}
      </div>

      {/* ──────────────── COMPANIES ──────────────── */}
      {view === 'companies' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400">
              {empLoading ? '' : `${employers.length} compan${employers.length !== 1 ? 'ies' : 'y'}`}
            </p>
            <button
              onClick={() => { setEditEmp('new'); setEmpFormErr(null) }}
              className="flex items-center gap-1.5 bg-brand hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            >
              <PlusIcon /> Add company
            </button>
          </div>

          {empLoading ? <SkeletonList />
           : empError  ? <ErrorBanner msg={empError} />
           : employers.length === 0 ? (
            <EmptyState icon={BuildingIcon} title="No companies yet" sub="Add your first company to get started." />
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {employers.map(emp => (
                <div key={emp.id} className="flex items-center justify-between px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{emp.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <span className="font-mono">{emp.employer_code}</span>
                      {' · '}
                      {rupees(emp.default_monthly_credit_paise)}/mo credit
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditEmp(emp); setEmpFormErr(null) }}
                    className="flex-none text-xs font-semibold text-brand hover:underline ml-4"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}

          {editEmp && (
            <Modal
              title={editEmp === 'new' ? 'Add company' : 'Edit company'}
              onClose={() => setEditEmp(null)}
              onSubmit={saveEmployer}
              saving={empSaving}
              error={empFormErr}
            >
              <Field label="Company name">
                <input
                  name="name"
                  type="text"
                  required
                  autoFocus
                  defaultValue={editEmp === 'new' ? '' : editEmp.name}
                  placeholder="e.g. Josalukas"
                  className={inputCls}
                />
              </Field>
              <Field label="Employer code">
                <input
                  name="employer_code"
                  type="text"
                  required
                  defaultValue={editEmp === 'new' ? '' : editEmp.employer_code}
                  placeholder="e.g. JOSA2026"
                  className={inputCls + ' uppercase'}
                  style={{ textTransform: 'uppercase' }}
                />
              </Field>
              <Field label="Monthly credit (₹)">
                <input
                  name="credit_rupees"
                  type="number"
                  min="0"
                  step="1"
                  required
                  defaultValue={editEmp === 'new' ? '3000' : toRupeeStr(editEmp.default_monthly_credit_paise)}
                  placeholder="3000"
                  className={inputCls}
                />
              </Field>
            </Modal>
          )}
        </div>
      )}

      {/* ──────────────── SECTIONS ──────────────── */}
      {view === 'sections' && (
        <div>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <select
              value={sectEmpId}
              onChange={e => setSectEmpId(e.target.value)}
              className={selectCls}
            >
              <option value="">Select company…</option>
              {employers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>

            {sectEmpId && (
              <button
                onClick={() => { setEditOut('new'); setOutFormErr(null) }}
                className="flex items-center gap-1.5 bg-brand hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors ml-auto"
              >
                <PlusIcon /> Add section
              </button>
            )}
          </div>

          {!sectEmpId ? (
            <EmptyState icon={PinIcon} title="Select a company" sub="Pick a company above to see its counters." />
          ) : outLoading ? <SkeletonList />
          : outError    ? <ErrorBanner msg={outError} />
          : outlets.length === 0 ? (
            <EmptyState
              icon={StoreIcon}
              title={`No sections for ${selectedSectEmp?.name ?? 'this company'}`}
              sub="Add a counter to get started."
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {outlets.map(out => (
                <div key={out.id} className="flex items-center justify-between px-4 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{out.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{out.kind}</p>
                  </div>
                  <button
                    onClick={() => { setEditOut(out); setOutFormErr(null) }}
                    className="flex-none text-xs font-semibold text-brand hover:underline ml-4"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}

          {editOut && (
            <Modal
              title={editOut === 'new'
                ? `Add section — ${selectedSectEmp?.name ?? ''}`
                : 'Edit section'}
              onClose={() => setEditOut(null)}
              onSubmit={saveOutlet}
              saving={outSaving}
              error={outFormErr}
            >
              <Field label="Section name">
                <input
                  name="name"
                  type="text"
                  required
                  autoFocus
                  defaultValue={editOut === 'new' ? '' : editOut.name}
                  placeholder="e.g. Main Meal Counter"
                  className={inputCls}
                />
              </Field>
              <Field label="Kind">
                <select
                  name="kind"
                  defaultValue={editOut === 'new' ? 'FOOD' : editOut.kind}
                  className={inputCls}
                >
                  {KIND_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </Modal>
          )}
        </div>
      )}

      {/* ──────────────── MENU ITEMS ──────────────── */}
      {view === 'items' && (
        <div>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <select
              value={itemEmpId}
              onChange={e => setItemEmpId(e.target.value)}
              className={selectCls}
            >
              <option value="">Select company…</option>
              {employers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>

            {itemEmpId && (
              <select
                value={itemOutId}
                onChange={e => setItemOutId(e.target.value)}
                className={selectCls}
              >
                <option value="">Select section…</option>
                {itemOutlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            )}

            {itemOutId && (
              <button
                onClick={() => { setEditItem('new'); setItemFormErr(null) }}
                className="flex items-center gap-1.5 bg-brand hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors ml-auto"
              >
                <PlusIcon /> Add item
              </button>
            )}
          </div>

          {!itemEmpId ? (
            <EmptyState icon={PinIcon} title="Select a company" sub="Then pick a counter to manage its menu." />
          ) : !itemOutId ? (
            <EmptyState icon={StoreIcon} title="Select a counter" sub="Pick a counter above to see its menu." />
          ) : itemLoading ? <SkeletonList rows={4} />
          : itemError   ? <ErrorBanner msg={itemError} />
          : items.length === 0 ? (
            <EmptyState
              icon={MenuIcon}
              title={`No items in ${selectedItemOut?.name ?? 'this section'}`}
              sub="Add the first item to this counter."
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`flex-none w-3 h-3 rounded-full ${VEG_DOT[item.veg]}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${item.is_available ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-400">{rupees(item.price_paise)}</p>
                  </div>
                  <button
                    onClick={() => toggleAvailability(item)}
                    className={`flex-none text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                      item.is_available
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {item.is_available ? 'Available' : 'Off'}
                  </button>
                  <button
                    onClick={() => { setEditItem(item); setItemFormErr(null) }}
                    className="flex-none text-xs font-semibold text-brand hover:underline"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}

          {editItem && (
            <Modal
              title={editItem === 'new'
                ? `Add item — ${selectedItemOut?.name ?? ''}`
                : 'Edit item'}
              onClose={() => setEditItem(null)}
              onSubmit={saveItem}
              saving={itemSaving}
              error={itemFormErr}
            >
              <Field label="Item name">
                <input
                  name="name"
                  type="text"
                  required
                  autoFocus
                  defaultValue={editItem === 'new' ? '' : editItem.name}
                  placeholder="e.g. Paneer Butter Masala"
                  className={inputCls}
                />
              </Field>
              <Field label="Type">
                <select
                  name="veg"
                  defaultValue={editItem === 'new' ? 'VEG' : editItem.veg}
                  className={inputCls}
                >
                  {VEG_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Price (₹)">
                <input
                  name="price_rupees"
                  type="number"
                  min="0"
                  step="1"
                  required
                  defaultValue={editItem === 'new' ? '' : toRupeeStr(editItem.price_paise)}
                  placeholder="e.g. 85"
                  className={inputCls}
                />
              </Field>
              <Field label="Description (optional)">
                <input
                  name="description"
                  type="text"
                  defaultValue={editItem === 'new' ? '' : (editItem.description ?? '')}
                  placeholder="Short description…"
                  className={inputCls}
                />
              </Field>
            </Modal>
          )}
        </div>
      )}
    </section>
  )
}
