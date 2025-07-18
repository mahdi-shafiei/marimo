/* Copyright 2024 Marimo. All rights reserved. */

import {
  horizontalListSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useAtomValue } from "jotai";
import {
  DatabaseIcon,
  SparklesIcon,
  SquareCodeIcon,
  SquareMIcon,
} from "lucide-react";
import { useEffect } from "react";
import { Cell } from "@/components/editor/Cell";
import { PackageAlert } from "@/components/editor/package-alert";
import { SortableCellsProvider } from "@/components/sort/SortableCellsProvider";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { maybeAddMarimoImport } from "@/core/cells/add-missing-import";
import type { CellId } from "@/core/cells/ids";
import { MarkdownLanguageAdapter } from "@/core/codemirror/language/languages/markdown";
import { SQLLanguageAdapter } from "@/core/codemirror/language/languages/sql";
import { aiEnabledAtom } from "@/core/config/config";
import { isConnectedAtom } from "@/core/network/connection";
import { useBoolean } from "@/hooks/useBoolean";
import { cn } from "@/utils/cn";
import { Functions } from "@/utils/functions";
import type { CellColumnId, CollapsibleTree } from "@/utils/id-tree";
import type { Milliseconds } from "@/utils/time";
import {
  type CellActions,
  columnIdsAtom,
  type NotebookState,
  SETUP_CELL_ID,
  useCellActions,
  useNotebook,
} from "../../../core/cells/cells";
import { formatAll } from "../../../core/codemirror/format";
import type { AppConfig, UserConfig } from "../../../core/config/config-schema";
import type { AppMode } from "../../../core/mode";
import type { ConnectionStatus } from "../../../core/websocket/types";
import { useHotkey } from "../../../hooks/useHotkey";
import { type Theme, useTheme } from "../../../theme/useTheme";
import { AddCellWithAI } from "../ai/add-cell-with-ai";
import { ConnectingAlert } from "../alerts/connecting-alert";
import { useDeleteCellCallback } from "../cell/useDeleteCell";
import { FloatingOutline } from "../chrome/panels/outline/floating-outline";
import { useChromeActions } from "../chrome/state";
import { Column } from "../columns/cell-column";
import { NotebookBanner } from "../notebook-banner";
import { StdinBlockingAlert } from "../stdin-blocking-alert";
import { useFocusFirstEditor } from "./vertical-layout/useFocusFirstEditor";
import { VerticalLayoutWrapper } from "./vertical-layout/vertical-layout-wrapper";

interface CellArrayProps {
  mode: AppMode;
  userConfig: UserConfig;
  appConfig: AppConfig;
  connStatus: ConnectionStatus;
}

export const CellArray: React.FC<CellArrayProps> = (props) => {
  const columnIds = useAtomValue(columnIdsAtom);

  // Setup context for sorting
  return (
    <SortableCellsProvider multiColumn={props.appConfig.width === "columns"}>
      <SortableContext
        id="column-container"
        items={columnIds}
        strategy={horizontalListSortingStrategy}
      >
        <CellArrayInternal {...props} />
      </SortableContext>
    </SortableCellsProvider>
  );
};

const CellArrayInternal: React.FC<CellArrayProps> = ({
  mode,
  userConfig,
  appConfig,
  connStatus,
}) => {
  const notebook = useNotebook();
  const actions = useCellActions();
  const { theme } = useTheme();
  const { toggleSidebarPanel } = useChromeActions();

  // Side-effects
  useFocusFirstEditor();

  // HOTKEYS
  useHotkey("global.focusTop", actions.focusTopCell);
  useHotkey("global.focusBottom", actions.focusBottomCell);
  useHotkey("global.toggleSidebar", toggleSidebarPanel);
  useHotkey("global.foldCode", actions.foldAll);
  useHotkey("global.unfoldCode", actions.unfoldAll);
  useHotkey("global.formatAll", () => {
    formatAll();
  });
  // Catch all to avoid native OS behavior
  // Otherwise a user might try to hide a cell and accidentally hide the OS window
  useHotkey("cell.hideCode", Functions.NOOP);
  useHotkey("cell.format", Functions.NOOP);

  const onDeleteCell = useDeleteCellCallback();

  // Scroll to a cell targeted by a previous action
  const scrollToTarget = actions.scrollToTarget;
  useEffect(() => {
    if (notebook.scrollKey !== null) {
      scrollToTarget();
    }
  }, [notebook.cellIds, notebook.scrollKey, scrollToTarget]);

  const columns = notebook.cellIds.getColumns();
  const hasOnlyOneCell = notebook.cellIds.hasOnlyOneId();
  const hasSetupCell = notebook.cellIds.inOrderIds.includes(SETUP_CELL_ID);

  return (
    <VerticalLayoutWrapper
      // 'pb' allows the user to put the cell in the middle of the screen
      className="pb-[40vh]"
      invisible={false}
      appConfig={appConfig}
      innerClassName="pr-4" // For the floating actions
    >
      <PackageAlert />
      <StdinBlockingAlert />
      <ConnectingAlert />
      <NotebookBanner width={appConfig.width} />
      <div
        className={cn(
          appConfig.width === "columns" &&
            "grid grid-flow-col auto-cols-min gap-6",
        )}
      >
        {columns.map((column, index) => (
          <CellColumn
            key={column.id}
            column={column}
            index={index}
            columnsLength={columns.length}
            appConfig={appConfig}
            notebook={notebook}
            mode={mode}
            userConfig={userConfig}
            connStatus={connStatus}
            actions={actions}
            theme={theme}
            hasOnlyOneCell={hasOnlyOneCell}
            hasSetupCell={hasSetupCell}
            onDeleteCell={onDeleteCell}
          />
        ))}
      </div>
      <FloatingOutline />
    </VerticalLayoutWrapper>
  );
};

/**
 * A single column of cells.
 */
const CellColumn: React.FC<{
  column: CollapsibleTree<CellId>;
  index: number;
  columnsLength: number;
  appConfig: AppConfig;
  notebook: NotebookState;
  mode: AppMode;
  userConfig: UserConfig;
  connStatus: ConnectionStatus;
  actions: CellActions;
  theme: Theme;
  hasOnlyOneCell: boolean;
  hasSetupCell: boolean;
  onDeleteCell: (payload: { cellId: CellId }) => void;
}> = ({
  column,
  index,
  columnsLength,
  appConfig,
  notebook,
  mode,
  userConfig,
  connStatus,
  actions,
  theme,
  hasOnlyOneCell,
  hasSetupCell,
  onDeleteCell,
}) => {
  const connectionState = connStatus.state;

  return (
    <Column
      columnId={column.id}
      index={index}
      canMoveLeft={index > 0}
      canMoveRight={index < columnsLength - 1}
      width={appConfig.width}
      canDelete={columnsLength > 1}
      footer={
        <AddCellButtons
          columnId={column.id}
          className={cn(
            appConfig.width === "columns" &&
              "opacity-0 group-hover/column:opacity-100",
          )}
        />
      }
    >
      <SortableContext
        id={`column-${index + 1}`}
        items={column.topLevelIds}
        strategy={verticalListSortingStrategy}
      >
        {/* Render the setup cell first, always */}
        {index === 0 && hasSetupCell && (
          <Cell
            key={SETUP_CELL_ID}
            theme={theme}
            showPlaceholder={false}
            {...notebook.cellData[SETUP_CELL_ID]}
            {...notebook.cellRuntime[SETUP_CELL_ID]}
            {...actions}
            runElapsedTimeMs={
              notebook.cellRuntime[SETUP_CELL_ID].runElapsedTimeMs ??
              (notebook.cellData[SETUP_CELL_ID]
                .lastExecutionTime as Milliseconds)
            }
            canDelete={true}
            mode={mode}
            connectionState={connectionState}
            ref={notebook.cellHandles[SETUP_CELL_ID]}
            userConfig={userConfig}
            isCollapsed={false}
            collapseCount={0}
            canMoveX={false}
            actions={actions}
            deleteCell={onDeleteCell}
          />
        )}

        {column.topLevelIds.map((cellId) => {
          // Skip the setup cell later
          if (cellId === SETUP_CELL_ID) {
            return null;
          }

          const cellData = notebook.cellData[cellId];
          const cellRuntime = notebook.cellRuntime[cellId];
          return (
            <Cell
              key={cellData.id.toString()}
              theme={theme}
              showPlaceholder={hasOnlyOneCell}
              {...cellData}
              {...cellRuntime}
              runElapsedTimeMs={
                cellRuntime.runElapsedTimeMs ??
                (cellData.lastExecutionTime as Milliseconds)
              }
              canDelete={!hasOnlyOneCell}
              mode={mode}
              connectionState={connectionState}
              ref={notebook.cellHandles[cellId]}
              userConfig={userConfig}
              config={cellData.config}
              name={cellData.name}
              isCollapsed={column.isCollapsed(cellId)}
              collapseCount={column.getCount(cellId)}
              canMoveX={appConfig.width === "columns"}
              actions={actions}
              deleteCell={onDeleteCell}
            />
          );
        })}
      </SortableContext>
    </Column>
  );
};

const AddCellButtons: React.FC<{
  columnId: CellColumnId;
  className?: string;
}> = ({ columnId, className }) => {
  const { createNewCell } = useCellActions();
  const [isAiButtonOpen, isAiButtonOpenActions] = useBoolean(false);
  const aiEnabled = useAtomValue(aiEnabledAtom);
  const isConnected = useAtomValue(isConnectedAtom);

  const buttonClass = cn(
    "mb-0 rounded-none sm:px-4 md:px-5 lg:px-8 tracking-wide no-wrap whitespace-nowrap",
    "hover:bg-accent hover:text-accent-foreground font-semibold uppercase text-xs",
  );

  const renderBody = () => {
    if (isAiButtonOpen) {
      return <AddCellWithAI onClose={isAiButtonOpenActions.toggle} />;
    }

    return (
      <>
        <Button
          className={buttonClass}
          variant="text"
          size="sm"
          disabled={!isConnected}
          onClick={() =>
            createNewCell({
              cellId: { type: "__end__", columnId },
              before: false,
            })
          }
        >
          <SquareCodeIcon className="mr-2 size-4 flex-shrink-0" />
          Python
        </Button>
        <Button
          className={buttonClass}
          variant="text"
          size="sm"
          disabled={!isConnected}
          onClick={() => {
            maybeAddMarimoImport({ autoInstantiate: true, createNewCell });

            createNewCell({
              cellId: { type: "__end__", columnId },
              before: false,
              code: new MarkdownLanguageAdapter().defaultCode,
              hideCode: true,
            });
          }}
        >
          <SquareMIcon className="mr-2 size-4 flex-shrink-0" />
          Markdown
        </Button>
        <Button
          className={buttonClass}
          variant="text"
          size="sm"
          disabled={!isConnected}
          onClick={() => {
            maybeAddMarimoImport({ autoInstantiate: true, createNewCell });

            createNewCell({
              cellId: { type: "__end__", columnId },
              before: false,
              code: new SQLLanguageAdapter().defaultCode,
            });
          }}
        >
          <DatabaseIcon className="mr-2 size-4 flex-shrink-0" />
          SQL
        </Button>
        <Tooltip
          content={
            aiEnabled ? null : <span>Enable via settings under AI Assist</span>
          }
          delayDuration={100}
          asChild={false}
        >
          <Button
            className={buttonClass}
            variant="text"
            size="sm"
            disabled={!aiEnabled || !isConnected}
            onClick={isAiButtonOpenActions.toggle}
          >
            <SparklesIcon className="mr-2 size-4 flex-shrink-0" />
            Generate with AI
          </Button>
        </Tooltip>
      </>
    );
  };

  return (
    <div className="flex justify-center mt-4 pt-6 pb-32 group gap-4 w-full print:hidden">
      <div
        className={cn(
          "shadow-sm border border-border rounded transition-all duration-200 overflow-hidden divide-x divide-border flex",
          !isAiButtonOpen && "w-fit",
          isAiButtonOpen &&
            "opacity-100 w-full max-w-4xl shadow-lg shadow-[var(--blue-3)]",
          className,
        )}
      >
        {renderBody()}
      </div>
    </div>
  );
};
