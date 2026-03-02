let editor;
let model;

window.createEditor = function () {
    require.config({
        paths: {
            vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs"
        }
    });

    require(["vs/editor/editor.main"], () => {
        model = monaco.editor.createModel("", "javascript");

        editor = monaco.editor.create(
            document.getElementById("editor"),
            {
                model,
                theme: "vs-dark",
                automaticLayout: true,
                fontSize: 14,
                minimap: { enabled: false },
                smoothScrolling: true,
                cursorSmoothCaretAnimation: "on",
                padding: { top: 10 }
            }
        );

        setupLanguageDropdown();
    });
};

function setupLanguageDropdown() {
    const select = document.getElementById("languageSelect");

    const languages = monaco.languages
        .getLanguages()
        .filter(l => l.id)
        .sort((a, b) => a.id.localeCompare(b.id));

    for (const lang of languages) {
        const opt = document.createElement("option");
        opt.value = lang.id;
        opt.textContent = lang.id;
        select.appendChild(opt);
    }

    select.value = "javascript";

    select.addEventListener("change", () => {
        monaco.editor.setModelLanguage(model, select.value);
    });
}

window.getEditor = () => editor;
window.getModel = () => model;