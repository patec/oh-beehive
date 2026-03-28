'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Check, GripVertical } from 'lucide-react'
import { saveVoiceSession } from '@/lib/actions/voice'
import { Button } from '@/components/ui/button'
import type { VoiceSession, ParsedInspection, BroodPattern, Population, Temperament, HoneyStores } from '@/lib/types'

type SlimHive = { id: string; name: string }

function DraggableSegment({ item, dragId }: { item: ParsedInspection; dragId: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: dragId })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className="bg-card border rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing touch-none select-none"
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-bold text-amber-700">{item.hiveName || 'Unidentified hive'}</p>
          <p className="text-xs text-muted-foreground italic line-clamp-3">&ldquo;{item.transcriptExcerpt}&rdquo;</p>
          {item.notes && <p className="text-xs text-foreground/80">{item.notes}</p>}
        </div>
      </div>
    </div>
  )
}

function InspectionEditor({
  inspection,
  index,
  onUpdate,
  onRemove,
}: {
  inspection: ParsedInspection
  index: number
  onUpdate: (index: number, updated: ParsedInspection) => void
  onRemove: (index: number) => void
}) {
  function set<K extends keyof ParsedInspection>(field: K, value: ParsedInspection[K]) {
    onUpdate(index, { ...inspection, [field]: value })
  }

  return (
    <div className="bg-amber-50/60 rounded-xl p-3 space-y-2.5 border border-amber-100">
      <div className="flex flex-wrap gap-3">
        <div className="space-y-0.5">
          <label className="text-xs font-semibold text-muted-foreground block">Queen seen</label>
          <select
            className="text-xs border rounded-lg px-2 py-1.5 bg-white"
            value={inspection.queen_seen === null ? '' : inspection.queen_seen ? 'yes' : 'no'}
            onChange={e => set('queen_seen', e.target.value === '' ? null : e.target.value === 'yes')}
          >
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div className="space-y-0.5">
          <label className="text-xs font-semibold text-muted-foreground block">Brood</label>
          <select
            className="text-xs border rounded-lg px-2 py-1.5 bg-white"
            value={inspection.brood_pattern ?? ''}
            onChange={e => set('brood_pattern', (e.target.value || null) as BroodPattern | null)}
          >
            <option value="">—</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
        <div className="space-y-0.5">
          <label className="text-xs font-semibold text-muted-foreground block">Population</label>
          <select
            className="text-xs border rounded-lg px-2 py-1.5 bg-white"
            value={inspection.population ?? ''}
            onChange={e => set('population', (e.target.value || null) as Population | null)}
          >
            <option value="">—</option>
            <option value="strong">Strong</option>
            <option value="medium">Medium</option>
            <option value="weak">Weak</option>
          </select>
        </div>
        <div className="space-y-0.5">
          <label className="text-xs font-semibold text-muted-foreground block">Temperament</label>
          <select
            className="text-xs border rounded-lg px-2 py-1.5 bg-white"
            value={inspection.temperament ?? ''}
            onChange={e => set('temperament', (e.target.value || null) as Temperament | null)}
          >
            <option value="">—</option>
            <option value="calm">Calm</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>
        <div className="space-y-0.5">
          <label className="text-xs font-semibold text-muted-foreground block">Honey stores</label>
          <select
            className="text-xs border rounded-lg px-2 py-1.5 bg-white"
            value={inspection.honey_stores ?? ''}
            onChange={e => set('honey_stores', (e.target.value || null) as HoneyStores | null)}
          >
            <option value="">—</option>
            <option value="full">Full</option>
            <option value="partial">Partial</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>
      <textarea
        className="w-full text-xs border rounded-lg p-2 bg-white resize-none"
        rows={2}
        placeholder="Notes..."
        value={inspection.notes ?? ''}
        onChange={e => set('notes', e.target.value || null)}
      />
      <input
        className="w-full text-xs border rounded-lg p-2 bg-white"
        placeholder="Next action..."
        value={inspection.next_action ?? ''}
        onChange={e => set('next_action', e.target.value || null)}
      />
      <button
        onClick={() => onRemove(index)}
        className="text-xs text-destructive hover:underline"
      >
        Remove
      </button>
    </div>
  )
}

function DroppableHiveCard({
  hive,
  inspections,
  onUpdate,
  onRemove,
}: {
  hive: SlimHive
  inspections: ParsedInspection[]
  onUpdate: (hiveId: string, updated: ParsedInspection[]) => void
  onRemove: (hiveId: string, index: number) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `hive-${hive.id}` })

  function updateInspection(index: number, updated: ParsedInspection) {
    const next = inspections.map((item, i) => i === index ? updated : item)
    onUpdate(hive.id, next)
  }

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border-2 transition-all ${isOver ? 'border-amber-400 bg-amber-50 scale-[1.01]' : 'border-amber-200 bg-card'} p-4 space-y-3`}
    >
      <h3 className="font-bold text-amber-800 text-lg">{hive.name}</h3>
      {inspections.length === 0 && (
        <div className={`text-center py-8 text-sm font-medium border-2 border-dashed rounded-xl transition-colors ${isOver ? 'border-amber-400 text-amber-600' : 'border-amber-200 text-muted-foreground'}`}>
          Drop a segment here to assign it
        </div>
      )}
      {inspections.map((insp, i) => (
        <InspectionEditor
          key={i}
          inspection={insp}
          index={i}
          onUpdate={updateInspection}
          onRemove={idx => onRemove(hive.id, idx)}
        />
      ))}
    </div>
  )
}

export function ReviewClient({
  session,
  hives,
  audioUrl,
}: {
  session: VoiceSession
  hives: SlimHive[]
  audioUrl: string | null
}) {
  const router = useRouter()
  const parsed = session.parsed_data ?? []

  const [assignedMap, setAssignedMap] = useState<Record<string, ParsedInspection[]>>(() => {
    const map: Record<string, ParsedInspection[]> = {}
    for (const item of parsed) {
      if (item.hiveId) {
        if (!map[item.hiveId]) map[item.hiveId] = []
        map[item.hiveId].push(item)
      }
    }
    return map
  })
  const [unassigned, setUnassigned] = useState<ParsedInspection[]>(() =>
    parsed.filter(i => !i.hiveId)
  )
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const activeDragItem = activeDragId?.startsWith('unassigned-')
    ? unassigned[parseInt(activeDragId.replace('unassigned-', ''))]
    : null

  function updateHive(hiveId: string, updated: ParsedInspection[]) {
    setAssignedMap(prev => ({ ...prev, [hiveId]: updated }))
  }

  function removeFromHive(hiveId: string, index: number) {
    setAssignedMap(prev => ({
      ...prev,
      [hiveId]: (prev[hiveId] ?? []).filter((_, i) => i !== index),
    }))
  }

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over) return

    const dragId = active.id as string
    const dropId = over.id as string

    if (!dragId.startsWith('unassigned-') || !dropId.startsWith('hive-')) return

    const idx = parseInt(dragId.replace('unassigned-', ''))
    const hiveId = dropId.replace('hive-', '')
    const item = unassigned[idx]
    if (!item) return

    setUnassigned(prev => prev.filter((_, i) => i !== idx))
    setAssignedMap(prev => ({
      ...prev,
      [hiveId]: [...(prev[hiveId] ?? []), { ...item, hiveId }],
    }))
  }, [unassigned])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  async function handleSave() {
    setSaving(true)
    const allInspections: ParsedInspection[] = Object.entries(assignedMap).flatMap(
      ([hiveId, items]) => items.map(item => ({ ...item, hiveId }))
    )
    const result = await saveVoiceSession(session.id, allInspections)
    if (result.error) {
      alert(result.error)
      setSaving(false)
    } else {
      router.push('/hives')
    }
  }

  const hivesWithData = hives.filter(h => (assignedMap[h.id]?.length ?? 0) > 0)
  const hivesWithout = hives.filter(h => !(assignedMap[h.id]?.length))
  const orderedHives = [...hivesWithData, ...hivesWithout]

  const totalInspections = Object.values(assignedMap).reduce((n, arr) => n + arr.length, 0)

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-amber-800">Review Voice Inspection</h1>
        <p className="text-sm text-muted-foreground font-semibold">
          Check the parsed results, fix anything that&apos;s off, then save.
        </p>
      </div>
      <Button
        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-6 text-lg shadow-lg"
        onClick={handleSave}
        disabled={saving || totalInspections === 0}
      >
        {saving
          ? 'Saving...'
          : totalInspections === 0
          ? 'Assign inspections to hives to save'
          : <><Check size={20} className="mr-2" /> Save {totalInspections} inspection{totalInspections !== 1 ? 's' : ''}</>}
      </Button>

      {audioUrl && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
          <p className="text-xs font-bold text-amber-700">Your recording</p>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}

      {session.transcript && (
        <details className="bg-card border rounded-xl overflow-hidden">
          <summary className="text-sm font-bold text-amber-700 cursor-pointer px-4 py-3 hover:bg-amber-50 transition-colors">
            Full transcript
          </summary>
          <p className="text-sm text-muted-foreground px-4 pb-4 pt-2 whitespace-pre-wrap border-t border-amber-100">
            {session.transcript}
          </p>
        </details>
      )}

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {unassigned.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Unassigned — drag to a hive below
            </h2>
            <div className="space-y-2">
              {unassigned.map((item, i) => (
                <DraggableSegment key={i} item={item} dragId={`unassigned-${i}`} />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Hives</h2>
          {orderedHives.map(hive => (
            <DroppableHiveCard
              key={hive.id}
              hive={hive}
              inspections={assignedMap[hive.id] ?? []}
              onUpdate={updateHive}
              onRemove={removeFromHive}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDragItem && (
            <div className="bg-card border-2 border-amber-400 rounded-xl p-3 shadow-2xl rotate-1 w-72">
              <p className="text-xs font-bold text-amber-700">{activeDragItem.hiveName}</p>
              <p className="text-xs text-muted-foreground italic line-clamp-2 mt-1">
                {activeDragItem.transcriptExcerpt}
              </p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

    </div>
  )
}
