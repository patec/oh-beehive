import type { Inspection } from '@/lib/types'

export function InspectionCard({ inspection }: { inspection: Inspection }) {
  const fields: [string, string | null][] = [
    ['Queen', inspection.queen_seen === null ? null : inspection.queen_seen ? 'Yes' : 'No'],
    ['Brood', inspection.brood_pattern],
    ['Population', inspection.population],
    ['Temperament', inspection.temperament],
    ['Honey', inspection.honey_stores],
  ]
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <p className="text-sm text-muted-foreground">
        {new Date(inspection.inspected_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
      </p>
      <div className="flex flex-wrap gap-2">
        {fields.filter(([, v]) => v !== null).map(([label, value]) => (
          <span key={label} className="text-xs bg-secondary px-2 py-1 rounded capitalize">
            {label}: {value}
          </span>
        ))}
      </div>
      {inspection.notes && <p className="text-sm">{inspection.notes}</p>}
      {inspection.next_action && (
        <p className="text-sm text-muted-foreground">Next: {inspection.next_action}</p>
      )}
    </div>
  )
}
