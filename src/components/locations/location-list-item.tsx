'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { LocationForm } from './location-form'
import { AddHiveDialog } from '@/components/hives/add-hive-dialog'
import { deleteLocation } from '@/lib/actions/locations'
import type { Location } from '@/lib/types'

export function LocationListItem({ location }: { location: Location }) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <li className="flex items-center justify-between p-3 border rounded-lg">
      <Link href={`/locations/${location.id}`} className="hover:underline">
        <p className="font-medium">{location.name}</p>
        {location.description && <p className="text-sm text-muted-foreground">{location.description}</p>}
      </Link>
      <div className="flex gap-2">
        <AddHiveDialog locationId={location.id} />
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger render={<Button variant="ghost" size="sm" />}>Edit</DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit location</DialogTitle></DialogHeader>
            <LocationForm location={location} onSuccess={() => setEditOpen(false)} />
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>Delete</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {location.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all hives, inspections, and harvests at this location.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={deleteLocation.bind(null, location.id) as unknown as (formData: FormData) => void}>
                <AlertDialogAction type="submit">Delete</AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  )
}
