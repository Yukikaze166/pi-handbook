/**
 * viewer-keys.ts — Scroll key matchers for the conversation viewer.
 *
 * Resolves `tui.select.*` through the user's keybindings when pi provides a
 * manager, falling back to the previous hardcoded keys otherwise. The viewer's
 * k/j and shift+arrow aliases always work alongside whatever is bound.
 */
/** The pi keybinding ids the viewer resolves. */
export type ViewerKeybindingId = "tui.select.up" | "tui.select.down" | "tui.select.pageUp" | "tui.select.pageDown" | "app.tools.expand";
/** Structural subset of pi-tui's `KeybindingsManager` (which satisfies it). */
export interface ViewerKeybindings {
    matches(data: string, keybinding: ViewerKeybindingId): boolean;
}
export interface ViewerKeys {
    scrollUp(data: string): boolean;
    scrollDown(data: string): boolean;
    pageUp(data: string): boolean;
    pageDown(data: string): boolean;
    /** Unfold the output of the viewer's tool blocks, as in the main transcript. */
    expand(data: string): boolean;
}
export declare function createViewerKeys(keybindings?: ViewerKeybindings): ViewerKeys;
