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
                minimap: { enabled: true },
                smoothScrolling: true,
                padding: { top: 10 },
                wordWrap: "on",
                lineNumbers: "on",
                renderWhitespace: "selection",
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true },
                formatOnPaste: true,
                formatOnType: true
            }
        );

        setupLanguageDropdown();
        setupKeyboardShortcuts();
    });
};

function setupLanguageDropdown() {
    const select = document.getElementById("languageSelect");

    select.innerHTML = "";

    const popularLanguages = [
        "javascript", "typescript", "python", "html", "css",
        "json", "markdown", "java", "cpp", "csharp", "php", "ruby"
    ];

    popularLanguages.forEach(langId => {
        const opt = document.createElement("option");
        opt.value = langId;
        opt.textContent = langId.charAt(0).toUpperCase() + langId.slice(1);
        select.appendChild(opt);
    });

    const separator = document.createElement("option");
    separator.disabled = true;
    separator.textContent = "──────────";
    select.appendChild(separator);

    const languages = monaco.languages
        .getLanguages()
        .filter(l => l.id && !popularLanguages.includes(l.id))
        .sort((a, b) => a.id.localeCompare(b.id));

    for (const lang of languages) {
        const opt = document.createElement("option");
        opt.value = lang.id;
        opt.textContent = lang.id;
        select.appendChild(opt);
    }

    select.value = "javascript";

    select.addEventListener("change", () => {
        const newLang = select.value;
        monaco.editor.setModelLanguage(model, newLang);

        localStorage.setItem("preferred_language", newLang);
    });

    const savedLang = localStorage.getItem("preferred_language");
    if (savedLang) {
        select.value = savedLang;
        monaco.editor.setModelLanguage(model, savedLang);
    }
}

function setupKeyboardShortcuts() {
    if (!editor) return;

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        if (currentRoom) {
            localStorage.setItem(`room_${currentRoom}`, editor.getValue());
            showNotification("Saved to browser storage", "success");
        }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
        editor.getAction("actions.find").run();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
        editor.getAction("editor.action.triggerSuggest").run();
    });

    editor.addCommand(monaco.KeyCode.F1, () => {
        editor.getAction("editor.action.quickCommand").run();
    });
}

window.formatCode = function () {
    if (editor) {
        editor.getAction("editor.action.formatDocument").run();
    }
};

window.toggleTheme = function () {
    const currentTheme = editor.getOption(monaco.editor.EditorOption.theme);
    const newTheme = currentTheme === "vs-dark" ? "vs-light" : "vs-dark";
    monaco.editor.setTheme(newTheme);
    localStorage.setItem("editor_theme", newTheme);
};

const savedTheme = localStorage.getItem("editor_theme");
if (savedTheme) {
    monaco.editor.setTheme(savedTheme);
}

window.getEditor = () => editor;