## Error Type
Console Error

## Error Message
Encountered two children with the same key, `HPMUON2-560-HPMUON2-961`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at tr (<anonymous>:null:null)
    at eval (components/board/board-issue-table.tsx:210:21)
    at Array.map (<anonymous>:null:null)
    at eval (components/board/board-issue-table.tsx:196:41)
    at Array.map (<anonymous>:null:null)
    at BoardIssueTable (components/board/board-issue-table.tsx:165:25)
    at BoardDetailPanel (components/board/board-detail-panel.tsx:54:13)
    at <unknown> (components/board/kanban-board.tsx:914:19)
    at Array.map (<anonymous>:null:null)
    at KanbanBoard (components/board/kanban-board.tsx:748:23)
    at BoardPage (app/(app)/board/page.tsx:928:11)

## Code Frame
  208 |
  209 |                   return (
> 210 |                     <tr key={`${groupKey}-$...
      |                     ^
  211 |                       {/* Key */}
  212 |                       <td className="py-1.5...
  213 |                         <button

Next.js version: 16.2.6 (Turbopack)
