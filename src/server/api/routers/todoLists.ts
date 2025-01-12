import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "~/server/db"; 

export const todoListsRouter = createTRPCRouter({
  getAllLists: publicProcedure.query(async () => {
    return db.todoList.findMany({
      include: { todos: true },
    });
  }),

  createList: publicProcedure
    .input(z.object({ title: z.string().optional() }))
    .mutation(async ({ input }) => {
      return db.todoList.create({
        data: { title: input.title ?? "" },
        include: { todos: true },
      });
    }),

  updateListTitle: publicProcedure
    .input(z.object({ listId: z.number(), newTitle: z.string() }))
    .mutation(async ({ input }) => {
      return db.todoList.update({
        where: { id: input.listId },
        data: { title: input.newTitle },
      });
    }),

  addTodo: publicProcedure
    .input(
      z.object({
        listId: z.number(),
        task: z.string(),
        estimatedPrice: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.todo.create({
        data: {
          task: input.task,
          estimatedPrice: input.estimatedPrice,
          listId: input.listId,
        },
      });
    }),

  // NOW define the missing ones:

  deleteList: publicProcedure
    .input(z.object({ listId: z.number() }))
    .mutation(async ({ input }) => {
      return db.todoList.delete({
        where: { id: input.listId },
      });
    }),

  updateTodo: publicProcedure
    .input(
      z.object({
        todoId: z.number(),
        newTask: z.string().optional(),
        newPrice: z.string().optional(),
        completed: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.todo.update({
        where: { id: input.todoId },
        data: {
          task: input.newTask,
          estimatedPrice: input.newPrice,
          completed: input.completed,
        },
      });
    }),

  removeTodo: publicProcedure
    .input(z.object({ todoId: z.number() }))
    .mutation(async ({ input }) => {
      return db.todo.delete({
        where: { id: input.todoId },
      });
    }),
});
