"use client";

import React from "react";

export default function AboutPage() {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-3xl font-bold">How to Use</h2>
      <ol className="list-inside list-decimal pl-4 text-white/90 leading-relaxed">
        <li>Click <strong>+</strong> to create a new list and add a title.</li>
        <li>Add tasks and optional costs, then press <em>Enter</em>.</li>
        <li>Drag and drop tasks or lists to rearrange them.</li>
        <li>Double-click for edit or stirkethrough task.</li>
        <li>Check the top-right for the total estimated cost.</li>
        <li>Delete upon hover on top right.</li>
      </ol>
    </section>
  );
}
