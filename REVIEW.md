# App Review

## Overview
- The app is a Vite/React single-page experience routed with `HashRouter` and a shared `Layout`, showing a dashboard, per-search workspace, chat, and settings views while honoring the saved theme preference. It initializes persisted data on mount and toggles the `dark` class on the document root based on settings. [Scope: entire repo]

## Strengths
- Uses Zustand to centralize searches, candidates, and settings with IndexedDB persistence, including a reconnect to the last active search via `localStorage`. Error handling sets user-facing state, and settings include model selection and theme. [Scope: entire repo]
- Candidates can be sorted and filtered in list or Kanban modes with upload toggling; empty-state messaging prompts uploads and allows CSV export from the list view. [Scope: entire repo]
- IndexedDB schema separates searches, candidates, and settings with indexes for status, search, and email, supporting richer queries and reuse across the app. [Scope: entire repo]

## Risks / Issues
- Candidate deletion relies on `confirm` without additional safeguards (e.g., undo or contextual messaging), which can lead to accidental permanent data loss because entries are removed from IndexedDB immediately. [Scope: entire repo]
- The search list emptiness check uses `searches.length` instead of `filteredSearches.length`, so when filters hide all items the UI still shows the grid rather than the empty-state guidance. [Scope: entire repo]
- Theme toggling only runs after `init` completes; if loading is slow, the app can flash the wrong theme before settings apply. [Scope: entire repo]

## Recommendations
- Replace `confirm` with a custom modal that clarifies which candidate is being removed, offers cancel/undo, and delays the IndexedDB delete until confirmation is explicit.
- Base the dashboard empty state on the filtered collection to give users feedback when no results match the search term, not just when there are zero total searches.
- Initialize theme immediately from `localStorage` (or a default) before async init completes to avoid a flash of incorrect theme on first paint.
