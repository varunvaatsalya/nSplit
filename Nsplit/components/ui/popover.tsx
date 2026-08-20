import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as PopoverPrimitive from '@rn-primitives/popover';
import { cssInterop } from 'nativewind';
import * as React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

cssInterop(PopoverPrimitive.Content, { className: 'style' });
cssInterop(PopoverPrimitive.Trigger, { className: 'style' });
cssInterop(PopoverPrimitive.Overlay, { className: 'style' });

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverClose = PopoverPrimitive.Close;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  portalHost,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  portalHost?: string;
}) {
  return (
    <PopoverPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <PopoverPrimitive.Overlay
          style={Platform.select({ native: StyleSheet.absoluteFill })}
        >
          <TextClassContext.Provider value="text-popover-foreground">
            <PopoverPrimitive.Content
              align={align}
              sideOffset={sideOffset}
              className={cn(
                'bg-popover border-border z-50 w-72 rounded-md border p-4 shadow-md shadow-black/5',
                Platform.select({
                  web: 'animate-in fade-in-0 zoom-in-95 outline-none',
                }),
                className
              )}
              {...props}
            />
          </TextClassContext.Provider>
        </PopoverPrimitive.Overlay>
      </FullWindowOverlay>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverClose, PopoverContent, PopoverTrigger };
