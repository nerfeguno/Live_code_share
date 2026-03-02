let editor;

function initializeEditor(language = "javascript") {
    require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs" } });
    require(["vs/editor/editor.main"], () => {
        editor = monaco.editor.create(document.getElementById("editor"), {
            value: "// Start coding here...\n",
            language: language,
            theme: "vs-dark",
            automaticLayout: true,
            fontSize: 14,
            minimap: { enabled: false },
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