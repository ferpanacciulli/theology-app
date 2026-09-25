import * as FlexLayout from "flexlayout-react";
import BibleView from "./BibleView";
import CommentaryPanel from "./CommentaryPanel";
import ModuleView from "./ModuleView";
import SearchView from "./SearchView";
import { model, persistModel } from "./layoutModel";

function factory(node: FlexLayout.TabNode) {
  const component = node.getComponent();

  if (component === "bible") return <BibleView node={node} />;
  if (component === "commentary") return <CommentaryPanel node={node} />;
  if (component === "search") return <SearchView />;
  if (component === "module") {
    return <ModuleView moduleId={node.getConfig()?.moduleId as string} />;
  }
  if (component === "notes") {
    return (
      <div className="h-full bg-zinc-900 text-white p-4 overflow-auto">
        <h1 className="text-xl font-bold">Notas</h1>
      </div>
    );
  }
  return <div className="h-full bg-zinc-900 text-white p-4">Panel</div>;
}

function Workspace() {
  return (
    <div className="h-full w-full relative">
      <FlexLayout.Layout model={model} factory={factory} onModelChange={persistModel} />
    </div>
  );
}

export default Workspace;
