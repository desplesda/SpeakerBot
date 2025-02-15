import {
  MouseEventHandler,
  PropsWithChildren,
  RefObject,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import IconAdd from "@material-symbols/svg-400/outlined/add.svg?url";
import IconEdit from "@material-symbols/svg-400/outlined/edit.svg?url";
import IconDelete from "@material-symbols/svg-400/outlined/delete.svg?url";

import io, { Socket } from "socket.io-client";

import { ServerState, ServerStateSchema } from "./schemas";
import { ToggleSwitch } from "./ToggleSwitch";

const roomName = new URL(window.location.toString()).searchParams.get("r");

function c(value: string): string;
function c(value: (string | boolean)[]): string;
function c(value: Record<string, boolean>): string;
function c(value: string | (string | boolean)[] | Record<string, boolean>) {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.filter((v) => !!v).join(" ");
  }
  return Object.entries(value)
    .filter(([, v]) => !!v)
    .map(([k]) => k)
    .join(" ");
}

const SimpleButton = (
  props: { className?: string; onClick: () => void } & PropsWithChildren
) => {
  return (
    <div
      className={
        "p-4 grow rounded-2xl box-border flex justify-center " + props.className
      }
      onClick={props.onClick}
    >
      {props.children}
    </div>
  );
};

const IconButton = (props: {
  icon: string;
  onClick: MouseEventHandler;
  className?: string;
}) => {
  return (
    <div onClick={props.onClick} className={"p-1" + (props.className ?? "")}>
      <img src={props.icon} className="h-5" />
    </div>
  );
};

type MessageGroup = ServerState["messages"]["groups"][0];
type MessageItem = MessageGroup["messages"][0];

const EditableButton = (
  props: {
    onClick: () => void;
    isEditing?: boolean;
    selected?: boolean;
    className?: string;
    onDeleted: () => void;
  } & { label: string; onRenamed: (newName: string) => void }
) => {
  const [isRenaming, setRename] = useState(false);
  const hasName = "label" in props;
  const [newName, setNewName] = useState(hasName ? props.label : "");

  useEffect(() => setNewName(props.label), [props.label]);

  const content = props.label;

  return (
    <div
      className={
        c([
          "p-2 md:p-4 rounded-2xl box-border flex justify-between items-center min-h-20",
        ]) +
        " " +
        (props.className ?? "")
      }
      onClick={props.onClick}
    >
      <div className="shrink md:p-2">
        {hasName && isRenaming && props.isEditing && (
          <input
            className="bg-white rounded-sm p-2 w-full"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => {
              props.onRenamed(newName);
              setRename(false);
            }}
            onKeyDown={(e) => {
              if (e.key == "Enter") {
                e.stopPropagation();
                props.onRenamed(newName);
                setRename(false);
              }
            }}
            autoFocus={true}
          />
        )}
        {!(isRenaming && props.isEditing) && content}
      </div>
      <div
        className={c({
          "w-[30px]": true,
          hidden: !props.isEditing || isRenaming,
        })}
      >
        <IconButton
          icon={IconEdit}
          onClick={(e) => {
            setRename(true);
            e.stopPropagation();
          }}
        />
        <IconButton
          icon={IconDelete}
          onClick={(e) => {
            props.onDeleted();
            e.stopPropagation();
          }}
        />
      </div>
    </div>
  );
};

const applyChanges = (socket: Socket, state: ServerState) => {
  socket.emit("set-messages", state);
};

type Op =
  | { type: "add-group"; name: string; contents?: MessageItem[] }
  | { type: "rename-group"; group: MessageGroup; name: string }
  | { type: "delete-group"; group: MessageGroup }
  | { type: "add-item"; group: MessageGroup; item: MessageItem }
  | { type: "remove-item"; group: MessageGroup; index: number }
  | {
      type: "rename-item";
      group: MessageGroup;
      index: number;
      name: string;
    }
  | { type: "load-state"; state: ServerState };

const useStateReducer = (socket: RefObject<Socket | null>) => {
  const reducer = useCallback(
    (state: ServerState, action: Op): ServerState => {
      let result: ServerState;
      let notifyServer = false;

      switch (action.type) {
        case "add-group":
          result = {
            ...state,
            messages: {
              groups: [
                ...state.messages.groups,
                { name: action.name, messages: action.contents ?? [] },
              ],
            },
          };
          notifyServer = true;
          break;
        case "rename-group":
          result = {
            ...state,
            messages: {
              groups: state.messages.groups.map((g) =>
                g === action.group ? { ...g, name: action.name } : g
              ),
            },
          };
          notifyServer = true;
          break;
        case "delete-group":
          result = {
            ...state,
            messages: {
              groups: state.messages.groups.filter((g) => g !== action.group),
            },
          };
          notifyServer = true;
          break;
        case "add-item":
          result = {
            ...state,
            messages: {
              groups: state.messages.groups.map((g) =>
                g === action.group
                  ? { ...g, messages: [...g.messages, action.item] }
                  : g
              ),
            },
          };
          notifyServer = true;
          break;
        case "remove-item":
          result = {
            ...state,
            messages: {
              groups: state.messages.groups.map((g) =>
                g === action.group
                  ? {
                      ...g,
                      messages: g.messages.filter(
                        (_m, i) => i !== action.index
                      ),
                    }
                  : g
              ),
            },
          };
          notifyServer = true;
          break;
        case "rename-item":
          result = {
            ...state,
            messages: {
              groups: state.messages.groups.map((g) =>
                g === action.group
                  ? {
                      ...g,
                      messages: g.messages.map((msg, i) =>
                        i === action.index ? action.name : msg
                      ),
                    }
                  : g
              ),
            },
          };
          notifyServer = true;
          break;
        case "load-state":
          result = action.state;
          break;
      }

      if (notifyServer && socket.current != null) {
        applyChanges(socket.current, result);
      }

      return result;
    },
    [socket]
  );

  return useReducer(reducer, {
    connectionState: { state: "not-connected" },
    messages: { groups: [] },
  });
};

function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const socket = useRef<Socket>(null);

  const [isEditing, setEditing] = useState(false);

  const [state, dispatch] = useStateReducer(socket);

  useEffect(() => {
    socket.current = io(
      "https://discord-speaker-bot-control.webpubsub.azure.com",
      {
        path: "/clients/socketio/hubs/Hub",
      }
    );

    if (roomName) {
      socket.current.emit("join-room", roomName);
    }

    // Receives a message from the server
    socket.current.on("server-state", (arg: unknown) => {
      const state = ServerStateSchema.parse(arg);

      dispatch({ type: "load-state", state });
    });

    // Sends a message to the server
    // socket.emit("send-message", "stranger");

    return () => {
      socket.current?.removeAllListeners("server-state");
      socket.current?.close();
      socket.current = null;
    };
  }, [dispatch]);

  const sendMessage = useCallback((message: string) => {
    socket.current?.emit("send-message", message);
  }, []);

  let idx = selectedIndex;
  if (idx < 0) {
    idx = 0;
  }
  if (idx >= state.messages.groups.length) {
    idx = state.messages.groups.length - 1;
  }

  if (idx != selectedIndex) {
    setSelectedIndex(idx);
  }

  const selectedMessages: MessageGroup = state.messages.groups[idx];

  if (!roomName) {
    return "No room name!";
  }

  if (!selectedMessages) {
    return "Waiting for server...";
  }

  if (state.connectionState.state === "not-connected") {
    return <div>SpeakerBot is not currently in a channel.</div>;
  }

  const Data = (props: { label: string; value: string }) => (
    <div>
      <span className="font-bold">{props.label}</span>: {props.value}
    </div>
  );

  return (
    <>
      <div className="flex justify-between">
        <Data label="Channel" value={state.connectionState.channel} />
        <Data label="User" value={state.connectionState.user} />
        <Data label="Voice" value={state.connectionState.voice} />

        <ToggleSwitch
          checked={isEditing}
          onChange={(e) => setEditing(e.target.checked)}
          label="Editing"
        />
      </div>
      <div>
        {/* <label htmlFor="editing">Editing</label>
        <input
          id="editing"
          type="checkbox"
          checked={isEditing}
          onChange={(e) => setEditing(e.target.checked)}
        /> */}
      </div>
      <div className="grid  grid-cols-3 xs:grid-cols-2 md:grid-cols-4 lg:grid-cols-5   justify-center gap-1 p-2">
        {(state?.messages.groups.length ?? 0) > 1 &&
          state?.messages.groups.map((g, i) => (
            <EditableButton
              key={i}
              label={g.name}
              className={c([
                " active:bg-amber-500 dark:active:bg-green-600 transition-colors active:duration-[0ms] duration-500",
                (g === selectedMessages && "bg-amber-200 dark:bg-green-800") ||
                  "bg-gray-300 dark:bg-gray-600",
              ])}
              onClick={() => setSelectedIndex(i)}
              selected={g === selectedMessages}
              isEditing={isEditing}
              onDeleted={() => {
                dispatch({ type: "delete-group", group: g });
              }}
              onRenamed={(name) => {
                dispatch({ type: "rename-group", group: g, name });
              }}
            />
          ))}

        {isEditing && (
          <SimpleButton
            onClick={() => {
              dispatch({
                type: "add-group",
                name: "New Group",
                contents: ["New Item"],
              });
            }}
          >
            <img src={IconAdd} />
          </SimpleButton>
        )}
      </div>
      <div className="p-2 grid grid-cols-3 xs:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 justify-between gap-2">
        {selectedMessages.messages.map((msg, i) => (
          <EditableButton
            label={msg}
            onClick={() => {
              if (!isEditing) {
                sendMessage(msg);
              }
            }}
            key={i}
            isEditing={isEditing}
            className={c([
              "bg-gray-200 dark:bg-gray-500",
              !isEditing &&
                "active:bg-blue-500 active:text-white transition-colors active:duration-[0ms] duration-700",
            ])}
            onDeleted={() => {
              dispatch({
                type: "remove-item",
                group: selectedMessages,
                index: i,
              });
            }}
            onRenamed={(v) => {
              dispatch({
                type: "rename-item",
                group: selectedMessages,
                index: i,
                name: v,
              });
            }}
          />
        ))}
        {isEditing && (
          <SimpleButton
            onClick={() => {
              dispatch({
                type: "add-item",
                group: selectedMessages,
                item: "New Item",
              });
            }}
          >
            <img src={IconAdd} />
          </SimpleButton>
        )}
      </div>
    </>
  );
}

export default App;
