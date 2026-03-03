let editor = null;

const Editor = {
    initializeEditor: async (language = "javascript") => {
        return new Promise((resolve) => {
            require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs" } });
            require(["vs/editor/editor.main"], () => {
                editor = monaco.editor.create(document.getElementById("editor"), {
                    value: "",
                    language: language,
                    theme: "vs-dark",
                    automaticLayout: true,
                    fontSize: 14,
                });
                resolve();
            });
        });
    },

    setEditorContent: (code) => {
        if (editor) {
            const model = editor.getModel();
            editor.executeEdits("", [
                { range: model.getFullModelRange(), text: code, forceMoveMarkers: true },
            ]);
        }
    },

    getEditorContent: () => {
        if (!editor) return "";
        return editor.getValue();
    },

    setEditorLanguage: (lang) => {
        if (!editor) return;
        monaco.editor.setModelLanguage(editor.getModel(), lang);
    },

    getEditorInstance: () => editor,
};