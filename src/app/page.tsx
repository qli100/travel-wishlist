"use client";
import React, { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";

// Auto-expanding textarea
function AutoExpandingTextarea({
  value,
  onChange,
  onBlur,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      {...props}
    />
  );
}

type TodoItem = {
  id: number;
  task: string;
  estimatedPrice?: string;
  completed?: boolean;
};

type TodoList = {
  id: number;
  title: string;
  todos: TodoItem[];
};

type DragData =
  | { type: "list"; fromIndex: number }
  | { type: "task"; listId: number; fromIndex: number };

export default function TravelTodoLists() {
  // 1) Fetch from DB (tRPC)
  const { data: serverLists = [], refetch } = api.todoLists.getAllLists.useQuery();

  // 2) tRPC mutations
  const createList = api.todoLists.createList.useMutation({ onSuccess: refetch });
  const deleteList = api.todoLists.deleteList.useMutation({ onSuccess: refetch });
  const updateListTitle = api.todoLists.updateListTitle.useMutation({ onSuccess: refetch });
  const addTodo = api.todoLists.addTodo.useMutation({ onSuccess: refetch });
  const updateTodo = api.todoLists.updateTodo.useMutation({ onSuccess: refetch });
  const removeTodo = api.todoLists.removeTodo.useMutation({ onSuccess: refetch });

  // Local ephemeral copy for drag reorder & inline edits
  const [ephemeralLists, setEphemeralLists] = useState<TodoList[]>([]);
  useEffect(() => {
    setEphemeralLists(JSON.parse(JSON.stringify(serverLists)));
  }, [serverLists]);

  // For new task/price inputs
  const [taskInputs, setTaskInputs] = useState<{ [listId: number]: string }>({});
  const [priceInputs, setPriceInputs] = useState<{ [listId: number]: string }>({});

  // DRAG & DROP
  const dragItemRef = useRef<DragData | null>(null);

  function reorderLists(fromIndex: number, toIndex: number) {
    setEphemeralLists((prev) => {
      const newLists = [...prev];
      const [moved] = newLists.splice(fromIndex, 1);
      newLists.splice(toIndex, 0, moved);
      return newLists;
    });
  }

  function reorderTasks(listId: number, fromIndex: number, toIndex: number) {
    setEphemeralLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        const newTodos = [...l.todos];
        const [moved] = newTodos.splice(fromIndex, 1);
        newTodos.splice(toIndex, 0, moved);
        return { ...l, todos: newTodos };
      })
    );
  }

  // List drag
  const handleListDragStart = (fromIndex: number) => {
    dragItemRef.current = { type: "list", fromIndex };
  };
  const handleListDrop = (toIndex: number) => {
    if (!dragItemRef.current) return;
    if (dragItemRef.current.type === "list") {
      reorderLists(dragItemRef.current.fromIndex, toIndex);
    }
    dragItemRef.current = null;
  };

  // Task drag
  const handleTaskDragStart = (listId: number, fromIndex: number) => {
    dragItemRef.current = { type: "task", listId, fromIndex };
  };
  const handleTaskDrop = (listId: number, toIndex: number) => {
    if (!dragItemRef.current) return;
    if (dragItemRef.current.type === "task") {
      const { listId: fromListId, fromIndex } = dragItemRef.current;
      if (fromListId === listId) {
        reorderTasks(listId, fromIndex, toIndex);
      }
    }
    dragItemRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // CRUD
  const handleAddList = () => {
    createList.mutate({ title: "" });
  };

  const handleDeleteList = (listId: number) => {
    deleteList.mutate({ listId });
  };

  const handleListTitleChange = (listId: number, newTitle: string) => {
    setEphemeralLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, title: newTitle } : l))
    );
  };
  const handleListTitleBlur = (listId: number, newTitle: string) => {
    updateListTitle.mutate({ listId, newTitle });
  };

  const handleAddTodo = (listId: number) => {
    const task = taskInputs[listId] || "";
    const price = priceInputs[listId] || "";
    if (!task.trim()) return;
    addTodo.mutate({ listId, task, estimatedPrice: price });
    setTaskInputs((prev) => ({ ...prev, [listId]: "" }));
    setPriceInputs((prev) => ({ ...prev, [listId]: "" }));
  };

  const handleTaskTextChange = (listId: number, todoId: number, newTask: string) => {
    setEphemeralLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) return list;
        return {
          ...list,
          todos: list.todos.map((t) =>
            t.id === todoId ? { ...t, task: newTask } : t
          ),
        };
      })
    );
  };
  const handleTaskTextBlur = (
    todoId: number,
    newTask?: string,
    newPrice?: string,
    completed?: boolean
  ) => {
    updateTodo.mutate({ todoId, newTask, newPrice, completed });
  };

  const handleTaskPriceChange = (listId: number, todoId: number, newPrice: string) => {
    setEphemeralLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) return list;
        return {
          ...list,
          todos: list.todos.map((t) =>
            t.id === todoId ? { ...t, estimatedPrice: newPrice } : t
          ),
        };
      })
    );
  };
  const handleTaskPriceBlur = (
    todoId: number,
    newTask?: string,
    newPrice?: string,
    completed?: boolean
  ) => {
    updateTodo.mutate({ todoId, newTask, newPrice, completed });
  };

  const handleRemoveTodo = (todoId: number) => {
    removeTodo.mutate({ todoId });
  };

  const handleToggleComplete = (listId: number, todo: TodoItem) => {
    setEphemeralLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          todos: l.todos.map((t) =>
            t.id === todo.id ? { ...t, completed: !t.completed } : t
          ),
        };
      })
    );
    updateTodo.mutate({
      todoId: todo.id,
      newTask: todo.task,
      newPrice: todo.estimatedPrice,
      completed: !todo.completed,
    });
  };

  const calcCost = (todos: TodoItem[]) => {
    const sum = todos.reduce((acc, t) => {
      const val = parseFloat(t.estimatedPrice || "0");
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    return sum > 0 ? `$${sum.toFixed(2)}` : "";
  };

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] p-4 text-white"
      onDragOver={handleDragOver}
    >
      <h1 className="mb-8 text-5xl font-extrabold tracking-tight sm:text-[5rem]">
        Travel <span className="text-[hsl(280,100%,70%)]">Wishlist</span>
      </h1>

      <button
        onClick={handleAddList}
        className="mb-8 text-4xl rounded-full bg-white/10 px-4 py-2 hover:bg-white/20"
      >
        +
      </button>

      <div className="flex flex-wrap gap-4">
        {ephemeralLists.map((list, listIndex) => {
          const cost = calcCost(list.todos);

          return (
            <div
              key={list.id}
              className="relative flex h-[36rem] w-[28rem] flex-col rounded-xl bg-white/10 p-4 shadow-lg"
            >
              {/* Title Row (group for hover) */}
              <div className="group flex w-full items-center justify-between">
                
                {/* Left side: handle + name (left aligned) */}
                <div className="flex items-center gap-2 overflow-hidden">
                  {/* drag handle */}
                  <span
                    draggable
                    onDragStart={() => handleListDragStart(listIndex)}
                    onDrop={() => handleListDrop(listIndex)}
                    className="cursor-move px-2 py-1 select-none"
                    title="Drag to reorder lists"
                  >
                    ☰
                  </span>

                  {/* list name, truncated if too long */}
                  <input
                    value={list.title}
                    onChange={(e) => handleListTitleChange(list.id, e.target.value)}
                    onBlur={() => handleListTitleBlur(list.id, list.title)}
                    className="
                      border-b border-transparent
                      bg-transparent 
                      text-xl font-bold 
                      text-white
                      focus:border-white
                      overflow-hidden 
                      text-ellipsis 
                      whitespace-nowrap
                      max-w-[14rem]
                    "
                    title={list.title} // show full name on hover
                  />
                </div>

                {/* Right side: cost & delete button */}
                <div className="flex items-center gap-2">
                  {/* cost label, if any */}
                  {cost && (
                    <span
                      className="text-right font-bold text-gray-400 whitespace-nowrap"
                      title={`Estimated cost: ${cost}`}
                    >
                      {`Estimated cost: ${cost}`}
                    </span>
                  )}
                  {/* delete button: hover only */}
                  <button
                    onClick={() => handleDeleteList(list.id)}
                    className="invisible text-pink-500 hover:text-pink-700 group-hover:visible"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Scrollable tasks area */}
              <div className="flex-grow overflow-auto mt-4">
                {/* Add Task */}
                <div className="mb-4 flex gap-2">
                  <AutoExpandingTextarea
                    placeholder="New task"
                    className="w-full max-w-[80%] resize-none rounded-md p-2 text-black"
                    rows={1}
                    value={taskInputs[list.id] || ""}
                    onChange={(e) =>
                      setTaskInputs((prev) => ({
                        ...prev,
                        [list.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddTodo(list.id);
                      }
                    }}
                  />
                  <input
                    placeholder="$"
                    className="w-16 rounded-md p-1 text-center text-black"
                    inputMode="numeric"
                    value={priceInputs[list.id] || ""}
                    onChange={(e) =>
                      setPriceInputs((prev) => ({
                        ...prev,
                        [list.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTodo(list.id);
                      }
                    }}
                  />
                </div>

                {/* Draggable tasks */}
                <div className="flex flex-col gap-2">
                  {list.todos.map((todo, taskIndex) => (
                    <div
                      key={todo.id}
                      className="group relative flex items-center justify-between rounded-md bg-white/20 p-2"
                      draggable
                      onDragStart={() => handleTaskDragStart(list.id, taskIndex)}
                      onDrop={() => handleTaskDrop(list.id, taskIndex)}
                    >
                      <AutoExpandingTextarea
                        value={todo.task}
                        onChange={(e) =>
                          handleTaskTextChange(list.id, todo.id, e.target.value)
                        }
                        onBlur={() =>
                          handleTaskTextBlur(
                            todo.id,
                            todo.task,
                            todo.estimatedPrice,
                            todo.completed
                          )
                        }
                        onDoubleClick={() => handleToggleComplete(list.id, todo)}
                        className={
                          "mr-2 w-full resize-none overflow-hidden border-b border-transparent bg-transparent focus:border-b-white " +
                          (todo.completed
                            ? " line-through text-gray-400"
                            : " text-white")
                        }
                        rows={1}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          inputMode="numeric"
                          value={todo.estimatedPrice || ""}
                          onChange={(e) =>
                            handleTaskPriceChange(list.id, todo.id, e.target.value)
                          }
                          onBlur={() =>
                            handleTaskPriceBlur(
                              todo.id,
                              todo.task,
                              todo.estimatedPrice,
                              todo.completed
                            )
                          }
                          className="w-16 border-b border-transparent bg-transparent text-right text-gray-400 focus:border-b-white"
                        />
                        <button
                          onClick={() => handleRemoveTodo(todo.id)}
                          className="invisible text-pink-500 hover:text-pink-700 group-hover:visible"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
