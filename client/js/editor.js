let editor;

export function initializeEditor(language = "javascript") {
    return new Promise((resolve) => {
        require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs" } });
        require(["vs/editor/editor.main"], () => {
            editor = monaco.editor.create(document.getElementById("editor"), {
                value: "// Start coding here...\n",
                language,
                theme: "vs-dark",
                automaticLayout: true,
                fontSize: 14,
                minimap: { enabled: false },
            });
            resolve(editor);
        });
    });
}

export function setEditorLanguage(lang) {
    if (editor) monaco.editor.setModelLanguage(editor.getModel(), lang);
}

export function getEditorContent() {
    return editor ? editor.getValue() : "";
}

export function setEditorContent(content) {
    if (editor) editor.setValue(content);
}