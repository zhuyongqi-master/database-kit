import React, { useState } from "react";
import CommandStreamSidebar from "./CommandStreamSidebar";
import CommandStreamControlPanel from "./CommandStreamControlPanel";

const CommandLayout: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="flex h-full">
      <aside className="flex-none w-[150px] overflow-y-auto border-r">
        <CommandStreamSidebar onSelectCommand={setSelectedIndex} selectedIndex={selectedIndex}/>
      </aside>
      <main className="flex-1 rounded-md border shadow-sm overflow-auto">
        <CommandStreamControlPanel commandStreamIndex={selectedIndex}/>
      </main>
    </div>
  );
};

export default CommandLayout;
