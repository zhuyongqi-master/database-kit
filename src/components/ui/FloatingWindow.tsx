import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@shadcn/components/ui/button";

type WindowPosition = Pick<DOMRect, "top" | "left" | "width" | "height">;

interface FloatingProgressProps {
  onClose: () => void;
  buttonRect: WindowPosition;
  children?: ReactNode;
}

const FloatingWindow = ({ onClose, buttonRect, children }: FloatingProgressProps) => {
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed z-50 w-40 bg-white border border-border shadow-lg rounded-lg overflow-visible"
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        style={{
          bottom: `${window.innerHeight - buttonRect.top + 10}px`,
          left: `${buttonRect.left + buttonRect.width / 2 - 128}px`, // Centered (256px / 2 = 128)
        }}
      >
        <div className="p-1">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold">Progress</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4"/>
            </Button>
          </div>
          <ul className="space-y-2">
            {/* here to render your own logic */}
            {children}
          </ul>
        </div>
        <div
          className="absolute w-4 h-4 border-l border-b border-border rotate-45"
          style={{
            bottom: "-8px",
            left: "50%",
            transform: "translateX(-50%) rotate(45deg)",
          }}
        ></div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default FloatingWindow;
export type { WindowPosition };
