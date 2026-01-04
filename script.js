        // データストア
        let memos = [];
        let currentMemoId = null;
        let nextId = 1;
        let currentFilter = 'all';
        let currentView = 'list';
        let currentSort = 'updated';
        let currentEditorMode = 'edit';

        // 初期データ
        function initData() {
            const saved = loadFromStorage();
            if (saved && saved.length > 0) {
                memos = saved;
                nextId = Math.max(...memos.map(m => m.id)) + 1;
            } else {
                memos = [
                    {
                        id: nextId++,
                        title: 'ようこそ！',
                        content: '# Claft風メモアプリへようこそ！\n\n## 主な機能\n\n- 📝 リッチテキスト編集\n- 📌 ピン留め機能\n- ⭐ お気に入り\n- 🎨 色分け\n- 📊 統計表示\n- 🔍 高度な検索\n- ⌨️ ショートカットキー\n\n**Ctrl+N** で新規メモを作成できます！',
                        tags: ['ideas'],
                        favorite: false,
                        pinned: true,
                        archived: false,
                        color: 'blue',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                ];
                saveToStorage();
            }
        }

        // 永続化
        function saveToStorage() {
            try {
                window.storage.set('memos-data', JSON.stringify(memos));
            } catch (e) {
                console.log('Storage not available');
            }
        }

        function loadFromStorage() {
            try {
                const data = window.storage.get('memos-data');
                if (data && data.value) {
                    return JSON.parse(data.value);
                }
            } catch (e) {
                console.log('Storage not available');
            }
            return null;
        }

        // 要素の取得
        const searchBox = document.getElementById('searchBox');
        const newMemoBtn = document.getElementById('newMemoBtn');
        const memoList = document.getElementById('memoList');
        const mainEditor = document.getElementById('mainEditor');
        const darkModeBtn = document.getElementById('darkModeBtn');
        const helpBtn = document.getElementById('helpBtn');
        const helpModal = document.getElementById('helpModal');
        const closeHelpBtn = document.getElementById('closeHelpBtn');
        const sortSelect = document.getElementById('sortSelect');

        // トースト通知
        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }

        // フィルタリング
        function getFilteredMemos(filter = '') {
            let filtered = memos.filter(memo => {
                const matchesSearch = memo.title.toLowerCase().includes(filter.toLowerCase()) ||
                                    memo.content.toLowerCase().includes(filter.toLowerCase());
                const matchesFilter = 
                    (currentFilter === 'all' && !memo.archived) ||
                    (currentFilter === 'favorites' && memo.favorite && !memo.archived) ||
                    (currentFilter === 'pinned' && memo.pinned && !memo.archived) ||
                    (currentFilter === 'archived' && memo.archived);
                return matchesSearch && matchesFilter;
            });

            // ソート
            filtered.sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                
                if (currentSort === 'updated') {
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
                } else if (currentSort === 'created') {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                } else if (currentSort === 'title') {
                    return a.title.localeCompare(b.title);
                }
            });

            return filtered;
        }

        // メモリストの描画
        function renderMemoList(filter = '') {
            const filteredMemos = getFilteredMemos(filter);

            memoList.className = currentView === 'grid' ? 'memo-list grid-view' : 'memo-list';

            memoList.innerHTML = filteredMemos.map(memo => {
                const date = new Date(memo.updatedAt);
                const dateStr = date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
                
                return `
                    <div class="memo-item ${currentMemoId === memo.id ? 'active' : ''} ${memo.pinned ? 'pinned' : ''}" 
                         data-id="${memo.id}" data-color="${memo.color || ''}">
                        <div class="memo-item-header">
                            <div class="memo-item-title">${memo.title || '無題のメモ'}</div>
                            <div class="memo-item-actions">
                                <button class="memo-action-btn pinned ${memo.pinned ? 'active' : ''}" data-id="${memo.id}" title="ピン留め">📌</button>
                                <button class="memo-action-btn favorite ${memo.favorite ? 'active' : ''}" data-id="${memo.id}" title="お気に入り">⭐</button>
                                <button class="memo-action-btn delete" data-id="${memo.id}" title="削除">🗑️</button>
                            </div>
                        </div>
                        <div class="memo-item-meta">
                            <span>${dateStr}</span>
                            <span>${memo.content.length}文字</span>
                        </div>
                        <div class="memo-item-preview">${memo.content.substring(0, 100) || 'メモを書く...'}</div>
                        <div class="memo-item-tags">
                            ${memo.tags.map(tag => `<span class="tag tag-${tag}">${tag}</span>`).join('')}
                        </div>
                    </div>
                `;
            }).join('');

            attachMemoListeners();
        }

        function attachMemoListeners() {
            document.querySelectorAll('.memo-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('memo-action-btn')) {
                        selectMemo(parseInt(item.dataset.id));
                    }
                });
            });

            document.querySelectorAll('.pinned').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    togglePin(parseInt(btn.dataset.id));
                });
            });

            document.querySelectorAll('.favorite').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleFavorite(parseInt(btn.dataset.id));
                });
            });

            document.querySelectorAll('.delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteMemo(parseInt(btn.dataset.id));
                });
            });
        }

        // 簡易Markdownパーサー
        function parseMarkdown(text) {
            return text
                .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/^- (.*$)/gm, '<li>$1</li>')
                .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/^(?!<[hul])/gm, '<p>')
                .replace(/(?<![>])$/gm, '</p>');
        }

        // エディタの描画
        function renderEditor(memoId) {
            const memo = memos.find(m => m.id === memoId);
            if (!memo) {
                mainEditor.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">✨</div>
                        <div class="empty-state-text">メモを選択するか、新しいメモを作成してください</div>
                        <div class="empty-state-hint">ショートカット: Ctrl+N で新規メモ</div>
                    </div>
                `;
                return;
            }

            const stats = {
                chars: memo.content.length,
                words: memo.content.split(/\s+/).filter(w => w).length,
                lines: memo.content.split('\n').length
            };

            mainEditor.innerHTML = `
                <div class="editor-header">
                    <input type="text" class="editor-title" id="editorTitle" placeholder="タイトルを入力..." value="${memo.title}">
                    <div class="editor-tabs">
                        <button class="editor-tab active" data-mode="edit">✏️ 編集</button>
                        <button class="editor-tab" data-mode="preview">👁️ プレビュー</button>
                    </div>
                    <div class="editor-toolbar">
                        <div class="toolbar-group">
                            <select class="tag-select" id="tagSelect">
                                <option value="">📌 タグを追加...</option>
                                <option value="work">work</option>
                                <option value="personal">personal</option>
                                <option value="ideas">ideas</option>
                                <option value="todo">todo</option>
                            </select>
                            <div class="memo-item-tags" id="currentTags">
                                ${memo.tags.map(tag => `<span class="tag tag-${tag}">${tag}</span>`).join('')}
                            </div>
                        </div>
                        <div class="toolbar-divider"></div>
                        <div class="toolbar-group">
                            <select class="color-select" id="colorSelect">
                                <option value="">🎨 色を選択...</option>
                                <option value="red">🔴 赤</option>
                                <option value="orange">🟠 オレンジ</option>
                                <option value="yellow">🟡 黄色</option>
                                <option value="green">🟢 緑</option>
                                <option value="blue">🔵 青</option>
                                <option value="purple">🟣 紫</option>
                                <option value="pink">🌸 ピンク</option>
                            </select>
                        </div>
                        <div class="toolbar-divider"></div>
                        <div class="toolbar-group">
                            <button class="icon-btn" id="duplicateBtn" title="複製">📋</button>
                            <button class="icon-btn" id="exportBtn" title="エクスポート">💾</button>
                            <button class="icon-btn" id="archiveBtn" title="${memo.archived ? 'アーカイブ解除' : 'アーカイブ'}">📁</button>
                        </div>
                    </div>
                    <div class="editor-stats">
                        <span>${stats.chars} 文字</span>
                        <span>${stats.words} 単語</span>
                        <span>${stats.lines} 行</span>
                    </div>
                </div>
                <div class="editor-content" id="editorContent">
                    <textarea class="editor-textarea" id="editorTextarea" placeholder="ここにメモを書く...">${memo.content}</textarea>
                </div>
            `;

            attachEditorListeners(memo);
        }

        function attachEditorListeners(memo) {
            const titleInput = document.getElementById('editorTitle');
            const contentInput = document.getElementById('editorTextarea');
            const tagSelect = document.getElementById('tagSelect');
            const colorSelect = document.getElementById('colorSelect');
            const duplicateBtn = document.getElementById('duplicateBtn');
            const exportBtn = document.getElementById('exportBtn');
            const archiveBtn = document.getElementById('archiveBtn');
            const editorTabs = document.querySelectorAll('.editor-tab');

            if (memo.color) {
                colorSelect.value = memo.color;
            }

            titleInput.addEventListener('input', (e) => {
                memo.title = e.target.value;
                memo.updatedAt = new Date().toISOString();
                saveToStorage();
                renderMemoList(searchBox.value);
            });

            contentInput.addEventListener('input', (e) => {
                memo.content = e.target.value;
                memo.updatedAt = new Date().toISOString();
                saveToStorage();
                renderMemoList(searchBox.value);
                updateStats();
            });

            tagSelect.addEventListener('change', (e) => {
                if (e.target.value && !memo.tags.includes(e.target.value)) {
                    memo.tags.push(e.target.value);
                    memo.updatedAt = new Date().toISOString();
                    saveToStorage();
                    renderEditor(memo.id);
                    renderMemoList(searchBox.value);
                }
                e.target.value = '';
            });

            colorSelect.addEventListener('change', (e) => {
                memo.color = e.target.value;
                memo.updatedAt = new Date().toISOString();
                saveToStorage();
                renderMemoList(searchBox.value);
                showToast('色を変更しました');
            });

            duplicateBtn.addEventListener('click', () => duplicateMemo(memo.id));
            exportBtn.addEventListener('click', () => exportMemo(memo.id));
            archiveBtn.addEventListener('click', () => toggleArchive(memo.id));

            editorTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    editorTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    toggleEditorMode(tab.dataset.mode);
                });
            });

            function updateStats() {
                const stats = {
                    chars: memo.content.length,
                    words: memo.content.split(/\s+/).filter(w => w).length,
                    lines: memo.content.split('\n').length
                };
                document.querySelector('.editor-stats').innerHTML = `
                    <span>${stats.chars} 文字</span>
                    <span>${stats.words} 単語</span>
                    <span>${stats.lines} 行</span>
                `;
            }
        }

        function toggleEditorMode(mode) {
            currentEditorMode = mode;
            const content = document.getElementById('editorContent');
            const textarea = document.getElementById('editorTextarea');
            
            if (mode === 'preview') {
                content.innerHTML = `<div class="markdown-preview">${parseMarkdown(textarea.value)}</div>`;
            } else {
                const currentContent = memos.find(m => m.id === currentMemoId)?.content || '';
                content.innerHTML = `<textarea class="editor-textarea" id="editorTextarea" placeholder="ここにメモを書く...">${currentContent}</textarea>`;
                attachEditorListeners(memos.find(m => m.id === currentMemoId));
            }
        }

        // メモ操作
        function selectMemo(id) {
            currentMemoId = id;
            renderEditor(id);
            renderMemoList(searchBox.value);
        }

        function createNewMemo() {
            const newMemo = {
                id: nextId++,
                title: '',
                content: '',
                tags: [],
                favorite: false,
                pinned: false,
                archived: false,
                color: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            memos.unshift(newMemo);
            saveToStorage();
            selectMemo(newMemo.id);
            showToast('新しいメモを作成しました');
        }

        function togglePin(id) {
            const memo = memos.find(m => m.id === id);
            if (memo) {
                memo.pinned = !memo.pinned;
                memo.updatedAt = new Date().toISOString();
                saveToStorage();
                renderMemoList(searchBox.value);
                showToast(memo.pinned ? 'ピン留めしました' : 'ピン留めを解除しました');
            }
        }

        function toggleFavorite(id) {
            const memo = memos.find(m => m.id === id);
            if (memo) {
                memo.favorite = !memo.favorite;
                memo.updatedAt = new Date().toISOString();
                saveToStorage();
                renderMemoList(searchBox.value);
                showToast(memo.favorite ? 'お気に入りに追加しました' : 'お気に入りから削除しました');
            }
        }

        function toggleArchive(id) {
            const memo = memos.find(m => m.id === id);
            if (memo) {
                memo.archived = !memo.archived;
                memo.updatedAt = new Date().toISOString();
                saveToStorage();
                if (memo.archived) {
                    currentMemoId = null;
                    renderEditor(null);
                }
                renderMemoList(searchBox.value);
                showToast(memo.archived ? 'アーカイブしました' : 'アーカイブを解除しました');
            }
        }

        function deleteMemo(id) {
            if (confirm('このメモを削除しますか？')) {
                memos = memos.filter(m => m.id !== id);
                saveToStorage();
                if (currentMemoId === id) {
                    currentMemoId = null;
                    renderEditor(null);
                }
                renderMemoList(searchBox.value);
                showToast('メモを削除しました');
            }
        }

        function duplicateMemo(id) {
            const memo = memos.find(m => m.id === id);
            if (memo) {
                const newMemo = {
                    ...memo,
                    id: nextId++,
                    title: memo.title + ' (コピー)',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                memos.unshift(newMemo);
                saveToStorage();
                selectMemo(newMemo.id);
                showToast('メモを複製しました');
            }
        }

        function exportMemo(id) {
            const memo = memos.find(m => m.id === id);
            if (memo) {
                const content = `# ${memo.title}\n\n${memo.content}`;
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${memo.title || 'memo'}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('メモをエクスポートしました');
            }
        }

        // イベントリスナー
        searchBox.addEventListener('input', (e) => {
            renderMemoList(e.target.value);
        });

        newMemoBtn.addEventListener('click', createNewMemo);

        darkModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            showToast('ダークモードを切り替えました');
        });

        helpBtn.addEventListener('click', () => {
            helpModal.classList.add('show');
        });

        closeHelpBtn.addEventListener('click', () => {
            helpModal.classList.remove('show');
        });

        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.classList.remove('show');
            }
        });

        // フィルタータブ
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.filter;
                renderMemoList(searchBox.value);
            });
        });

        // ビュー切替
        document.querySelectorAll('.control-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.control-btn[data-view]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentView = btn.dataset.view;
                renderMemoList(searchBox.value);
            });
        });

        // ソート
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderMemoList(searchBox.value);
        });

        // ショートカットキー
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'n') {
                    e.preventDefault();
                    createNewMemo();
                } else if (e.key === 's') {
                    e.preventDefault();
                    saveToStorage();
                    showToast('保存しました');
                } else if (e.key === 'f') {
                    e.preventDefault();
                    searchBox.focus();
                } else if (e.key === 'd') {
                    e.preventDefault();
                    if (currentMemoId) {
                        deleteMemo(currentMemoId);
                    }
                } else if (e.key === 'b') {
                    e.preventDefault();
                    if (currentMemoId) {
                        toggleFavorite(currentMemoId);
                    }
                } else if (e.shiftKey && e.key === 'D') {
                    e.preventDefault();
                    darkModeBtn.click();
                }
            }
        });

        // 初期化
        initData();
        renderMemoList();

        // 自動保存（5秒ごと）
        setInterval(() => {
            if (memos.length > 0) {
                saveToStorage();
            }
        }, 5000);