tab.addEventListener('click', e => {
  console.log(e.target);
});

console.log(document.querySelectorAll('.filter-tab'));
// SVGアイコンテンプレート
        const icons = {
            star: '<svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
            pin: '<svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
            trash: '<svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
        };

        // データストア
        let memos = [];
        let currentMemoId = null;
        let nextId = 1;
        let currentFilter = 'all';
        let currentView = 'list';
        let currentSort = 'updated';
        let currentEditorMode = 'edit';
        let contextMenuMemoId = null;

        // 初期データ
        async function initData() {
            try {
                const result = await window.storage.get('memos-data');
                if (result && result.value) {
                    memos = JSON.parse(result.value);
                    nextId = Math.max(...memos.map(m => m.id)) + 1;
                    return;
                }
            } catch (e) {
                console.log('Loading from storage failed, using default data');
            }
            
            memos = [
                {
                    id: nextId++,
                    title: 'ようこそ！',
                    content: '# Claft風メモアプリへようこそ！\n\n## 主な機能\n\n- リッチテキスト編集\n- ピン留め機能\n- お気に入り\n- 色分け\n- 右クリックメニュー\n- タグ削除機能\n\n**右クリック**でメモの操作メニューを表示！',
                    tags: ['ideas'],
                    favorite: false,
                    pinned: true,
                    archived: false,
                    color: 'blue',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];
            await saveToStorage();
        }

        // 永続化
        async function saveToStorage() {
            try {
                await window.storage.set('memos-data', JSON.stringify(memos));
            } catch (e) {
                console.log('Storage not available');
            }
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
        const contextMenu = document.getElementById('contextMenu');

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
                                <button class="memo-action-btn pinned ${memo.pinned ? 'active' : ''}" data-id="${memo.id}" title="ピン留め">${icons.pin}</button>
                                <button class="memo-action-btn favorite ${memo.favorite ? 'active' : ''}" data-id="${memo.id}" title="お気に入り">${icons.star}</button>
                                <button class="memo-action-btn delete" data-id="${memo.id}" title="削除">${icons.trash}</button>
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
                    if (!e.target.closest('.memo-action-btn')) {
                        selectMemo(parseInt(item.dataset.id));
                    }
                });

                // 右クリックメニュー
                item.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    contextMenuMemoId = parseInt(item.dataset.id);
                    showContextMenu(e.clientX, e.clientY);
                });
            });

            document.querySelectorAll('.pinned').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await togglePin(parseInt(btn.dataset.id));
                });
            });

            document.querySelectorAll('.favorite').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await toggleFavorite(parseInt(btn.dataset.id));
                });
            });

            document.querySelectorAll('.delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await deleteMemo(parseInt(btn.dataset.id));
                });
            });
        }

        // 右クリックメニューの表示
        function showContextMenu(x, y) {
            contextMenu.style.left = x + 'px';
            contextMenu.style.top = y + 'px';
            contextMenu.classList.add('show');

            setTimeout(() => {
                const rect = contextMenu.getBoundingClientRect();
                if (rect.right > window.innerWidth) {
                    contextMenu.style.left = (x - rect.width) + 'px';
                }
                if (rect.bottom > window.innerHeight) {
                    contextMenu.style.top = (y - rect.height) + 'px';
                }
            }, 0);
        }

        function hideContextMenu() {
            contextMenu.classList.remove('show');
            contextMenuMemoId = null;
        }

        // コンテキストメニューのイベント
        document.querySelectorAll('.context-menu-item[data-action]').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                const color = item.dataset.color;

                if (!contextMenuMemoId) return;

                switch(action) {
                    case 'edit':
                        selectMemo(contextMenuMemoId);
                        break;
                    case 'duplicate':
                        await duplicateMemo(contextMenuMemoId);
                        break;
                    case 'favorite':
                        await toggleFavorite(contextMenuMemoId);
                        break;
                    case 'pin':
                        await togglePin(contextMenuMemoId);
                        break;
                    case 'color':
                        await changeColor(contextMenuMemoId, color);
                        break;
                    case 'archive':
                        await toggleArchive(contextMenuMemoId);
                        break;
                    case 'export':
                        await exportMemo(contextMenuMemoId);
                        break;
                    case 'delete':
                        await deleteMemo(contextMenuMemoId);
                        break;
                }

                hideContextMenu();
            });
        });

        document.addEventListener('click', hideContextMenu);
        contextMenu.addEventListener('click', (e) => e.stopPropagation());

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
                        <button class="editor-tab active" data-mode="edit">
                            <svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            編集
                        </button>
                        <button class="editor-tab" data-mode="preview">
                            <svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                            プレビュー
                        </button>
                    </div>
                    <div class="editor-toolbar">
                        <div class="toolbar-group">
                            <select class="tag-select" id="tagSelect">
                                <option value="">タグを追加...</option>
                                <option value="work">work</option>
                                <option value="personal">personal</option>
                                <option value="ideas">ideas</option>
                                <option value="todo">todo</option>
                            </select>
                            <div class="memo-item-tags" id="currentTags">
                                ${memo.tags.map(tag => `
                                    <span class="tag tag-${tag}">
                                        ${tag}
                                        <span class="tag-remove" data-tag="${tag}">×</span>
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                        <div class="toolbar-divider"></div>
                        <div class="toolbar-group">
                            <select class="color-select" id="colorSelect">
                                <option value="">色を選択...</option>
                                <option value="red">赤</option>
                                <option value="orange">オレンジ</option>
                                <option value="yellow">黄色</option>
                                <option value="green">緑</option>
                                <option value="blue">青</option>
                                <option value="purple">紫</option>
                                <option value="pink">ピンク</option>
                            </select>
                        </div>
                        <div class="toolbar-divider"></div>
                        <div class="toolbar-group">
                            <button class="icon-btn" id="duplicateBtn" title="複製">
                                <svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                            </button>
                            <button class="icon-btn" id="exportBtn" title="エクスポート">
                                <svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                            </button>
                            <button class="icon-btn" id="archiveBtn" title="${memo.archived ? 'アーカイブ解除' : 'アーカイブ'}">
                                <svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                                </svg>
                            </button>
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

            titleInput.addEventListener('input', async (e) => {
                memo.title = e.target.value;
                memo.updatedAt = new Date().toISOString();
                await saveToStorage();
                renderMemoList(searchBox.value);
            });

            contentInput.addEventListener('input', async (e) => {
                memo.content = e.target.value;
                memo.updatedAt = new Date().toISOString();
                await saveToStorage();
                renderMemoList(searchBox.value);
                updateStats();
            });

            tagSelect.addEventListener('change', async (e) => {
                if (e.target.value && !memo.tags.includes(e.target.value)) {
                    memo.tags.push(e.target.value);
                    memo.updatedAt = new Date().toISOString();
                    await saveToStorage();
                    renderEditor(memo.id);
                    renderMemoList(searchBox.value);
                }
                e.target.value = '';
            });

            // タグ削除機能
            document.querySelectorAll('.tag-remove').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const tagToRemove = btn.dataset.tag;
                    memo.tags = memo.tags.filter(tag => tag !== tagToRemove);
                    memo.updatedAt = new Date().toISOString();
                    await saveToStorage();
                    renderEditor(memo.id);
                    renderMemoList(searchBox.value);
                    showToast('タグを削除しました');
                });
            });

            colorSelect.addEventListener('change', async (e) => {
                memo.color = e.target.value;
                memo.updatedAt = new Date().toISOString();
                await saveToStorage();
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

        async function createNewMemo() {
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
            await saveToStorage();
            selectMemo(newMemo.id);
            showToast('新しいメモを作成しました');
        }

        async function togglePin(id) {
            const memo = memos.find(m => m.id === id);
            if (memo) {
                memo.pinned = !memo.pinned;
                memo.updatedAt = new Date().toISOString();
                await saveToStorage();
                renderMemoList(searchBox.value);
                showToast(memo.pinned ? 'ピン留めしました' : 'ピン留めを解除しました');
            }
        }

        async function toggleFavorite(id) {
            const memo = memos.find(m => m.id === id);
            if (memo) {
                memo.favorite = !memo.favorite;
                memo.updatedAt = new Date().toISOString();
                await saveToStorage();
                renderMemoList(searchBox.value);
                showToast(memo.favorite ? 'お気に入りに追加しました' : 'お気に入りから削除しました');
            }
        }

        async function toggleArchive(id) {
            const memo = memos.find(m => m.id === id);
            if (memo) {
                memo.archived = !memo.archived;
                memo.updatedAt = new Date().toISOString();
                await saveToStorage();
                if (memo.archived) {
                    currentMemoId = null;
                    renderEditor(null);
                }
                renderMemoList(searchBox.value);
                showToast(memo.archived ? 'アーカイブしました' : 'アーカイブを解除しました');
            }
        }

        async function changeColor(id, color) {
            const memo = memos.find(m => m.id === id);
            if (memo) {
                memo.color = color;
                memo.updatedAt = new Date().toISOString();
                await saveToStorage();
                renderMemoList(searchBox.value);
                if (currentMemoId === id) {
                    renderEditor(id);
                }
                showToast('色を変更しました');
            }
        }

        async function deleteMemo(id) {
            if (confirm('このメモを削除しますか？')) {
                memos = memos.filter(m => m.id !== id);
                await saveToStorage();
                if (currentMemoId === id) {
                    currentMemoId = null;
                    renderEditor(null);
                }
                renderMemoList(searchBox.value);
                showToast('メモを削除しました');
            }
        }

        async function duplicateMemo(id) {
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
                await saveToStorage();
                selectMemo(newMemo.id);
                showToast('メモを複製しました');
            }
        }

        async function exportMemo(id) {
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
        initData().then(() => {
            renderMemoList();
        });

        // 自動保存（5秒ごと）
        setInterval(async () => {
            if (memos.length > 0) {
                await saveToStorage();
            }
        }, 5000);