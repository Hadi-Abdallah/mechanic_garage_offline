"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"

export { Dialog, DialogTrigger, DialogClose, DialogFooter, DialogDescription }

export interface ScrollableDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogContent> {
  maxHeight?: string
}

export const ScrollableDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  ScrollableDialogContentProps
>(({ className, children, maxHeight = "85vh", ...props }, ref) => (
  <DialogContent 
    ref={ref} 
    className={`max-h-[85vh] flex flex-col ${className}`} 
    style={{ maxHeight }}
    {...props}
  >
    {children}
  </DialogContent>
))
ScrollableDialogContent.displayName = "ScrollableDialogContent"

export interface ScrollableDialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  sticky?: boolean
}

export const ScrollableDialogHeader = React.forwardRef<HTMLDivElement, ScrollableDialogHeaderProps>(
  ({ className, sticky = true, ...props }, ref) => (
    <DialogHeader
      ref={ref}
      className={`${sticky ? "sticky top-0 z-10 bg-background pt-4 pb-2 px-6 -mx-6 -mt-4" : ""} ${className}`}
      {...props}
    />
  ),
)
ScrollableDialogHeader.displayName = "ScrollableDialogHeader"

export interface ScrollableDialogBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ScrollableDialogBody = React.forwardRef<HTMLDivElement, ScrollableDialogBodyProps>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref} 
      className={`flex-1 overflow-y-auto px-6 py-2 -mx-6 max-h-[60vh] ${className}`} 
      style={{ overflowY: 'auto' }}
      {...props} 
    />
  ),
)
ScrollableDialogBody.displayName = "ScrollableDialogBody"

export const ScrollableDialogTitle = DialogTitle

