import React from 'react';
import { BellRing, BellOff, Bell } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface NotificationBadgeProps {
  permissionStatus: string;
}

export function NotificationBadge({ permissionStatus }: NotificationBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-2"
            tabIndex={0}
            role="img"
            aria-label={
              permissionStatus === 'granted'
                ? 'Notifications enabled'
                : permissionStatus === 'denied'
                  ? 'Notifications blocked — enable in browser settings'
                  : 'Waiting for notification permission response'
            }
          >
            {permissionStatus === 'granted' && (
              <BellRing className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
            )}
            {permissionStatus === 'denied' && (
              <BellOff className="h-5 w-5 text-gray-400 dark:text-gray-600" aria-hidden="true" />
            )}
            {permissionStatus === 'default' && (
              <Bell className="h-5 w-5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {permissionStatus === 'granted' && 'Notifications enabled'}
          {permissionStatus === 'denied' && 'Notifications blocked — enable in browser settings'}
          {permissionStatus === 'default' && 'Waiting for notification permission response'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
