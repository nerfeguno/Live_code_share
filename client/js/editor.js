let editor;

function initializeEditor(language = "javascript") {
    return new Promise((resolve) => {
        if (editor) {
            editor.dispose();
            editor = null;
        }

        require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs" } });
        require(["vs/editor/editor.main"], () => {
            editor = monaco.editor.create(document.getElementById("editor"), {
                value: "// Start coding here...\n",
                language: language,
                theme: "vs-dark",
                automaticLayout: true,
                fontSize: 14,
                minimap: { enabled: false },
            });
            resolve(editor);
        });
    });
}

function setEditorLanguage(lang) {
    if (editor) monaco.editor.setModelLanguage(editor.getModel(), lang);
}

function getEditorContent() {
    return editor ? editor.getValue() : "";
}

function setEditorContent(content) {
    if (editor) editor.setValue(content);
}

window.Editor = { initializeEditor, setEditorLanguage, getEditorContent, setEditorContent };