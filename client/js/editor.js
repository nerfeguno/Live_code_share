let editor = null;

const Editor = {
    initializeEditor: async (language = "javascript") => {
        if (editor) return; // Prevent multiple instances
        return new Promise((resolve) => {
            require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs" } });
            require(["vs/editor/editor.main"], () => {
                editor = monaco.editor.create(document.getElementById("editor"), {
                    value: "",
                    language: language,
                    theme: "vs-dark",
                    automaticLayout: true,
                    fontSize: 14,
                    fixedOverflowWidgets: true
                });
                resolve();
            });
        });
    },

    setEditorLanguage: (lang) => {
        if (!editor) return;
        const model = editor.getModel();
        monaco.editor.setModelLanguage(model, lang);
    },

    getEditorInstance: () => editor,
};