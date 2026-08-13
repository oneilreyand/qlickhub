# UI Component Policy for Agents

This policy is mandatory for every frontend change.

1. Inspect `apps/web/src/components/ui` before writing any UI markup.
2. Use an existing atom, molecule, or organism when it matches the interaction. Do not recreate buttons, inputs, textareas, cards, badges, drawers, modals, snackbars, tables, folder trees, task status badges, or loading states in a page.
3. If no suitable component exists, add the smallest reusable component at the correct level:
   - **Atom:** one visual primitive, such as `Button`, `Input`, `Card`, `Badge`, or `IconButton`.
   - **Molecule:** a small interaction made from atoms, such as a date picker or status badge.
   - **Organism:** a meaningful reusable section, such as a task collection, folder tree, or task detail drawer.
4. Pages coordinate route state, data loading, and composition only. Keep presentation and repeated interaction markup in components.
5. Every new interactive component must support keyboard operation, accessible labels, disabled/loading/error states where relevant, click-outside dismissal for popovers, and the established design tokens.
6. Use Redux Toolkit/Thunk for global errors, snackbar messages, and shared asynchronous state. Do not introduce local toast/error infrastructure.
7. Add the component to Component Gallery when it represents a generally reusable UI pattern.
