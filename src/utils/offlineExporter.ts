import { LESSONS } from '../data/lessons';
import { CHEAT_SHEET, STAGE_FLOW_ROWS } from '../data/cheatSheet';

const OFFLINE_COMMAND_ENGINE_JS = `
    function runCommandEffect(prev, effect, rawCommand) {
      const s = JSON.parse(JSON.stringify(prev));
      s.activeFlow = null;
      s.highlightStage = null;
      switch (effect.type) {
        case 'intro_git':
          s.initialized = true;
          s.highlightStage = 'local';
          s.activeFlow = { from: 'workspace', to: 'local', direction: 'forward', command: rawCommand, label: 'Git = Local Engine (100% Offline)' };
          s.terminalLines = [
            '$ # GIT — Distributed Version Control System (Local Engine)',
            'Created by: Linus Torvalds (2005) for the Linux kernel after BitKeeper ended free access.',
            'Ownership: Free & Open-Source (GNU GPL v2) — community maintained.',
            'Scope: Powers Stages 1–3 (Workspace, Staging Area, Local Repo) offline.'
          ];
          return s;
        case 'intro_github':
          s.remoteConnected = true;
          s.highlightStage = 'remote';
          s.activeFlow = { from: 'local', to: 'remote', direction: 'inspect', command: rawCommand, label: 'GitHub = Cloud Vault (Owned by Microsoft)' };
          s.terminalLines = [
            '$ # GITHUB — Cloud Hosting & Collaboration Platform',
            'Founded: 2008 | Ownership: Acquired & owned by Microsoft since 2018 ($7.5B).',
            'Scope: Hosts Stage 4 (Remote Repo) + Pull Requests, Issues & Actions.'
          ];
          return s;
        case 'intro_sync':
          s.initialized = true;
          s.remoteConnected = true;
          s.highlightStage = 'remote';
          s.activeFlow = { from: 'local', to: 'remote', direction: 'forward', command: rawCommand, label: 'Git (Local) pushes snapshots → GitHub (Cloud)' };
          s.terminalLines = [
            '$ # HOW THEY WORK TOGETHER',
            '1. Git records snapshots locally in .git/ (zero internet needed).',
            '2. GitHub stores remote backups so teammates can review, pull & collaborate.'
          ];
          return s;
        case 'version':
          s.terminalLines = ['$ ' + rawCommand, 'git version 2.47.1 — Local Git engine installed and ready.'];
          s.highlightStage = 'workspace';
          return s;
        case 'init':
          s.initialized = true;
          s.highlightStage = 'local';
          s.activeFlow = { from: 'workspace', to: 'local', direction: 'forward', command: rawCommand, label: 'Creates hidden .git/ recorder' };
          s.terminalLines = ['$ ' + rawCommand, 'Initialized empty Git repository in ~/my-room-project/.git/', 'Created: .git/HEAD, .git/config, .git/objects/, .git/refs/heads/'];
          return s;
        case 'uninit':
          s.initialized = false;
          s.staging = [];
          s.localCommits = [];
          s.highlightStage = 'workspace';
          s.activeFlow = { from: 'local', to: 'workspace', direction: 'backward', command: rawCommand, label: 'Removes .git/ camera (files remain)' };
          s.terminalLines = ['$ ' + rawCommand, 'Removed .git/ folder. Project files remain untouched, but Git tracking is off.'];
          return s;
        case 'config_set':
          if (effect.arg) s.config.name = effect.arg;
          if (effect.arg2) s.config.email = effect.arg2;
          s.config.autocrlf = 'true';
          s.highlightStage = 'local';
          s.activeFlow = { from: 'workspace', to: 'local', direction: 'local', command: rawCommand, label: 'Writes operator identity' };
          s.terminalLines = ['$ ' + rawCommand, 'Saved in Git config: user.name="' + (s.config.name || '(not set)') + '" | user.email="' + (s.config.email || '(not set)') + '"'];
          return s;
        case 'config_list':
          s.highlightStage = 'local';
          s.terminalLines = ['$ ' + rawCommand, 'user.name=' + (s.config.name || '(not set)'), 'user.email=' + (s.config.email || '(not set)'), 'core.autocrlf=' + s.config.autocrlf];
          return s;
        case 'status':
        case 'status_short': {
          const lines = ['$ ' + rawCommand];
          s.staging.forEach(f => lines.push('A  ' + f.name));
          s.workspace.forEach(f => {
            if (f.status === 'untracked') lines.push('?? ' + f.name);
            if (f.status === 'modified') lines.push(' M ' + f.name);
            if (f.status === 'deleted') lines.push(' D ' + f.name);
          });
          if (lines.length === 1) lines.push('(clean working tree)');
          s.highlightStage = 'workspace';
          s.terminalLines = lines;
          return s;
        }
        case 'add_file': {
          const target = effect.arg || 'index.html';
          const idx = s.workspace.findIndex(f => f.name === target && f.status !== 'ignored');
          if (idx !== -1) {
            const file = s.workspace[idx];
            if (!s.staging.some(st => st.name === file.name)) {
              s.staging.push({ name: file.name, status: 'staged', detail: 'Ready to commit' });
            }
            s.workspace[idx] = { ...file, status: 'clean', detail: 'Copied to Staging Area' };
            s.activeFlow = { from: 'workspace', to: 'staging', direction: 'forward', command: rawCommand, label: 'Staged ' + target };
            s.highlightStage = 'staging';
            s.terminalLines = ['$ ' + rawCommand, 'Placed "' + target + '" into the Staging Area (index).'];
          } else {
            s.terminalLines = ['$ ' + rawCommand, '"' + target + '" is already staged or ignored.'];
          }
          return s;
        }
        case 'add_all': {
          const movable = s.workspace.filter(f => f.status === 'untracked' || f.status === 'modified' || f.status === 'deleted');
          if (!movable.length) {
            s.terminalLines = ['$ ' + rawCommand, 'Nothing new to stage. All eligible files are already staged.'];
            return s;
          }
          movable.forEach(f => {
            if (!s.staging.some(st => st.name === f.name)) {
              s.staging.push({ name: f.name, status: f.status === 'deleted' ? 'deleted' : 'staged', detail: 'Staged for commit' });
            }
          });
          s.workspace = s.workspace.map(f => (f.status === 'untracked' || f.status === 'modified') ? { ...f, status: 'clean', detail: 'Staged in index' } : f);
          s.activeFlow = { from: 'workspace', to: 'staging', direction: 'forward', command: rawCommand, label: 'Staged ' + movable.length + ' file(s)' };
          s.highlightStage = 'staging';
          s.terminalLines = ['$ ' + rawCommand, 'Staged ' + movable.length + ' file(s): ' + movable.map(f => f.name).join(', ')];
          return s;
        }
        case 'commit': {
          if (!s.staging.length) {
            s.terminalLines = ['$ ' + rawCommand, 'Nothing to commit. Stage changes with "git add ." first.'];
            return s;
          }
          const msg = effect.arg || 'Add project files';
          const newHash = Math.random().toString(16).slice(2, 9).padEnd(7, 'a');
          const files = s.staging.map(f => f.name);
          s.localCommits.unshift({ id: newHash, message: msg, branch: s.currentBranch, files, author: s.config.name || 'Mamun' });
          s.staging = [];
          s.activeFlow = { from: 'staging', to: 'local', direction: 'forward', command: rawCommand, label: 'Snapshot ' + newHash + ' saved' };
          s.highlightStage = 'local';
          s.terminalLines = ['$ ' + rawCommand, '[' + s.currentBranch + ' ' + newHash + '] ' + msg, ' ' + files.length + ' file(s) committed to Local Repository.'];
          return s;
        }
        case 'commit_am': {
          const trackedMods = s.workspace.filter(f => f.status === 'modified');
          const stagedNames = s.staging.map(f => f.name);
          const committedFiles = Array.from(new Set([...stagedNames, ...trackedMods.map(f => f.name)]));
          if (!committedFiles.length) {
            s.terminalLines = ['$ ' + rawCommand, 'No modified tracked files found. (-am skips untracked files)'];
            return s;
          }
          const msg = effect.arg || 'Update tracked files';
          s.localCommits.unshift({ id: 'c9f41e2', message: msg, branch: s.currentBranch, files: committedFiles, author: s.config.name || 'Mamun' });
          s.staging = [];
          s.workspace = s.workspace.map(f => f.status === 'modified' ? { ...f, status: 'clean', detail: 'Committed via -am' } : f);
          s.activeFlow = { from: 'workspace', to: 'local', direction: 'forward', command: rawCommand, label: 'Auto-staged & committed' };
          s.highlightStage = 'local';
          s.terminalLines = ['$ ' + rawCommand, '[' + s.currentBranch + ' c9f41e2] ' + msg, 'Auto-staged modified tracked files (' + committedFiles.join(', ') + ') and saved snapshot.'];
          return s;
        }
        case 'commit_amend': {
          if (!s.localCommits.length) {
            s.terminalLines = ['$ ' + rawCommand, 'No previous commit to amend yet — make a commit first.'];
            return s;
          }
          const updatedMsg = effect.arg || 'Polish homepage';
          const prevCommit = s.localCommits[0];
          const stagedCount = s.staging.length;
          const amendedHash = prevCommit.id === 'b7e309d' ? 'f2a841c' : 'b7e309d';
          s.localCommits[0] = { ...prevCommit, id: amendedHash, message: updatedMsg, files: Array.from(new Set([...prevCommit.files, ...s.staging.map(f => f.name)])) };
          s.staging = [];
          s.activeFlow = stagedCount > 0
            ? { from: 'staging', to: 'local', direction: 'forward', command: rawCommand, label: 'Folded ' + stagedCount + ' file(s) into HEAD' }
            : { from: 'local', to: 'local', direction: 'local', command: rawCommand, label: 'Rewrote HEAD ' + prevCommit.id + ' → ' + amendedHash };
          s.highlightStage = 'local';
          s.terminalLines = [
            '$ ' + rawCommand,
            '[' + s.currentBranch + ' ' + amendedHash + '] ' + updatedMsg,
            stagedCount > 0
              ? 'Replaced ' + prevCommit.id + ' in-place and folded ' + stagedCount + ' staged file(s) into it.'
              : 'Replaced ' + prevCommit.id + ' in-place (message updated; no extra commit added).'
          ];
          return s;
        }
        case 'diff_workspace':
          s.highlightStage = 'workspace';
          s.activeFlow = { from: 'workspace', to: 'staging', direction: 'inspect', command: rawCommand, label: 'Compares Workspace vs Staging' };
          s.terminalLines = ['$ ' + rawCommand, '--- a/app.js  (Staging Area)', '+++ b/app.js  (Workspace)', '- const title = "Draft";', '+ const title = "GitFrame Live";'];
          return s;
        case 'diff_staged':
          s.highlightStage = 'staging';
          s.activeFlow = { from: 'staging', to: 'local', direction: 'inspect', command: rawCommand, label: 'Compares Staging vs Last Commit' };
          s.terminalLines = ['$ ' + rawCommand, '--- a/styles.css  (HEAD Commit)', '+++ b/styles.css  (Staging Area)', '+ .hero { background: #F8FAFC; }'];
          return s;
        case 'show_commit': {
          const target = s.localCommits[0];
          s.highlightStage = 'local';
          s.terminalLines = target
            ? ['$ ' + rawCommand, 'commit ' + target.id + ' (HEAD -> ' + target.branch + ')', 'Author: ' + target.author + '  |  Message: "' + target.message + '"', 'Files in snapshot: ' + target.files.join(', ')]
            : ['$ ' + rawCommand, 'No commits recorded yet.'];
          return s;
        }
        case 'log_oneline':
          s.highlightStage = 'local';
          s.terminalLines = ['$ ' + rawCommand, ...s.localCommits.map((c, i) => c.id + (i === 0 ? ' (HEAD -> ' + s.currentBranch + ')' : '') + ' ' + c.message)];
          return s;
        case 'log_stat':
          s.highlightStage = 'local';
          s.terminalLines = ['$ ' + rawCommand, ...s.localCommits.slice(0, 2).map(c => c.id + ' ' + c.message + ' | ' + c.files.length + ' file(s): ' + c.files.join(', '))];
          return s;
        case 'checkout_past':
          if (s.localCommits.length > 1) {
            const past = s.localCommits[s.localCommits.length - 1];
            s.headDetachedAt = past.id;
            s.activeFlow = { from: 'local', to: 'workspace', direction: 'backward', command: rawCommand, label: 'Time-traveled to ' + past.id };
            s.highlightStage = 'local';
            s.terminalLines = ['$ ' + rawCommand, 'HEAD is now at ' + past.id + ' (' + past.message + ') — Detached HEAD mode.'];
          }
          return s;
        case 'checkout_main':
          s.headDetachedAt = null;
          s.currentBranch = 'main';
          s.highlightStage = 'local';
          s.activeFlow = { from: 'local', to: 'workspace', direction: 'forward', command: rawCommand, label: 'Returned to latest main' };
          s.terminalLines = ['$ ' + rawCommand, 'Switched back to branch "main". HEAD reattached to latest snapshot.'];
          return s;
        case 'restore_staged': {
          if (!s.staging.length) {
            s.terminalLines = ['$ ' + rawCommand, 'Staging Area is already empty.'];
            return s;
          }
          const names = s.staging.map(f => f.name);
          s.workspace = s.workspace.map(w => names.includes(w.name) ? { ...w, status: 'modified', detail: 'Unstaged back to Workspace' } : w);
          s.staging = [];
          s.activeFlow = { from: 'staging', to: 'workspace', direction: 'backward', command: rawCommand, label: 'Unstaged -> Workspace' };
          s.highlightStage = 'workspace';
          s.terminalLines = ['$ ' + rawCommand, 'Removed ' + names.join(', ') + ' from Staging Area. Your edits remain safe in Workspace.'];
          return s;
        }
        case 'restore_workspace':
          s.workspace = s.workspace.map(f => (f.status === 'modified' || f.status === 'deleted') ? { ...f, status: 'clean', detail: 'Restored to HEAD snapshot' } : f);
          s.activeFlow = { from: 'local', to: 'workspace', direction: 'backward', command: rawCommand, label: 'Discarded local edits' };
          s.highlightStage = 'workspace';
          s.terminalLines = ['$ ' + rawCommand, 'Restored modified tracked files in Workspace back to the last committed snapshot.'];
          return s;
        case 'clean_preview': {
          const u = s.workspace.filter(f => f.status === 'untracked');
          s.highlightStage = 'workspace';
          s.terminalLines = ['$ ' + rawCommand, u.length ? 'Dry run — would delete untracked files: ' + u.map(f => f.name).join(', ') : 'Dry run — no untracked files to clean.'];
          return s;
        }
        case 'clean_force': {
          const r = s.workspace.filter(f => f.status === 'untracked');
          s.workspace = s.workspace.filter(f => f.status !== 'untracked');
          s.highlightStage = 'workspace';
          s.terminalLines = ['$ ' + rawCommand, r.length ? 'Deleted untracked clutter: ' + r.map(f => f.name).join(', ') : 'Workspace already free of untracked files.'];
          return s;
        }
        case 'reset_soft': {
          if (s.localCommits.length <= 1) { s.terminalLines = ['$ ' + rawCommand, 'Already at initial commit.']; return s; }
          const popped = s.localCommits.shift();
          popped.files.forEach(fn => { if (!s.staging.some(f => f.name === fn)) s.staging.push({ name: fn, status: 'staged', detail: 'Kept staged from ' + popped.id }); });
          s.activeFlow = { from: 'local', to: 'staging', direction: 'backward', command: rawCommand, label: 'Local -> Staging (--soft)' };
          s.highlightStage = 'staging';
          s.terminalLines = ['$ ' + rawCommand, 'Undid commit ' + popped.id + ' ("' + popped.message + '").', 'Files moved back to Staging Area — ready to edit message or re-commit.'];
          return s;
        }
        case 'reset_mixed': {
          if (s.localCommits.length <= 1) { s.terminalLines = ['$ ' + rawCommand, 'Already at initial commit.']; return s; }
          const popped = s.localCommits.shift();
          s.staging = [];
          popped.files.forEach(fn => {
            const ex = s.workspace.find(w => w.name === fn);
            if (ex) { ex.status = 'modified'; ex.detail = 'Unstaged from ' + popped.id; }
            else s.workspace.push({ name: fn, status: 'modified', detail: 'Unstaged from ' + popped.id });
          });
          s.activeFlow = { from: 'local', to: 'workspace', direction: 'backward', command: rawCommand, label: 'Local -> Workspace (default)' };
          s.highlightStage = 'workspace';
          s.terminalLines = ['$ ' + rawCommand, 'Undid commit ' + popped.id + '. Changes preserved as unstaged edits in Workspace.'];
          return s;
        }
        case 'reset_hard': {
          if (s.localCommits.length <= 1) { s.terminalLines = ['$ ' + rawCommand, 'Already at initial commit.']; return s; }
          const popped = s.localCommits.shift();
          s.staging = [];
          s.workspace = s.workspace.filter(f => !popped.files.includes(f.name) || f.name === 'index.html').map(f => ({ ...f, status: 'clean', detail: 'Hard-reset to ' + s.localCommits[0].id }));
          s.activeFlow = { from: 'local', to: 'workspace', direction: 'backward', command: rawCommand, label: 'Destructive rewind (--hard)' };
          s.highlightStage = 'local';
          s.terminalLines = ['$ ' + rawCommand, 'HEAD is now at ' + s.localCommits[0].id + '. Warning: Commit ' + popped.id + ' and uncommitted changes were erased.'];
          return s;
        }
        case 'rm_file': {
          const target = effect.arg || 'old-notes.txt';
          s.workspace = s.workspace.filter(f => f.name !== target);
          if (!s.staging.some(f => f.name === target)) s.staging.push({ name: target, status: 'deleted', detail: 'Deleted from disk & index' });
          s.activeFlow = { from: 'workspace', to: 'staging', direction: 'forward', command: rawCommand, label: 'Removed ' + target };
          s.highlightStage = 'staging';
          s.terminalLines = ['$ ' + rawCommand, "rm '" + target + "' — Deleted from Workspace and staged the removal."];
          return s;
        }
        case 'rm_cached': {
          const target = effect.arg || 'secrets.env';
          s.staging = s.staging.filter(f => f.name !== target);
          s.workspace = s.workspace.map(f => f.name === target ? { ...f, status: 'untracked', detail: 'Kept on disk, untracked' } : f);
          s.activeFlow = { from: 'staging', to: 'workspace', direction: 'backward', command: rawCommand, label: 'Untracked ' + target + ' (--cached)' };
          s.highlightStage = 'workspace';
          s.terminalLines = ['$ ' + rawCommand, "rm '" + target + "' from Git index only. File remains safely on your hard drive!"];
          return s;
        }
        case 'mv_file': {
          const fromN = effect.arg || 'file1.js', toN = effect.arg2 || 'main.js';
          s.workspace = s.workspace.map(f => f.name === fromN ? { name: toN, status: 'renamed', detail: 'Renamed from ' + fromN } : f);
          s.staging.push({ name: fromN + ' → ' + toN, status: 'renamed', detail: 'Rename staged' });
          s.activeFlow = { from: 'workspace', to: 'staging', direction: 'forward', command: rawCommand, label: 'Renamed -> ' + toN };
          s.highlightStage = 'staging';
          s.terminalLines = ['$ ' + rawCommand, 'Renamed "' + fromN + '" to "' + toN + '" and staged the move in one step.'];
          return s;
        }
        case 'create_gitignore':
          if (!s.workspace.some(f => f.name === '.gitignore')) s.workspace.push({ name: '.gitignore', status: 'untracked', detail: 'Ignores *.psd, *.log, .env' });
          s.workspace = s.workspace.map(f => (f.name.endsWith('.psd') || f.name.endsWith('.env') || f.name.endsWith('.log')) ? { ...f, status: 'ignored', detail: 'Hidden (.gitignore)' } : f);
          s.highlightStage = 'workspace';
          s.terminalLines = ['$ ' + rawCommand, 'Created .gitignore with rules: *.psd, *.log, secrets.env', 'Git camera now skips matching files automatically.'];
          return s;
        case 'stash_push': {
          const dirty = s.workspace.filter(f => f.status === 'modified');
          if (!dirty.length) { s.terminalLines = ['$ ' + rawCommand, 'No local modifications to save to Stash.']; return s; }
          s.stash.unshift('WIP on ' + s.currentBranch + ': ' + dirty.map(f => f.name).join(', '));
          s.workspace = s.workspace.map(f => f.status === 'modified' ? { ...f, status: 'clean', detail: 'Saved in Stash' } : f);
          s.activeFlow = { from: 'workspace', to: 'local', direction: 'local', command: rawCommand, label: 'Shelved into Stash drawer' };
          s.highlightStage = 'workspace';
          s.terminalLines = ['$ ' + rawCommand, 'Saved working directory state to stash@{0}. Workspace is now clean!'];
          return s;
        }
        case 'stash_list':
          s.highlightStage = 'workspace';
          s.terminalLines = ['$ ' + rawCommand, ...(s.stash.length ? s.stash.map((it, i) => 'stash@{' + i + '}: ' + it) : ['(Stash drawer is empty)'])];
          return s;
        case 'stash_pop': {
          if (!s.stash.length) { s.terminalLines = ['$ ' + rawCommand, 'No stash entries found to pop.']; return s; }
          const item = s.stash.shift();
          s.workspace = s.workspace.map(f => (f.name === 'checkout.js' || f.name === 'app.js') ? { ...f, status: 'modified', detail: 'Restored from Stash' } : f);
          s.activeFlow = { from: 'local', to: 'workspace', direction: 'backward', command: rawCommand, label: 'Restored from Stash' };
          s.highlightStage = 'workspace';
          s.terminalLines = ['$ ' + rawCommand, 'Re-applied and dropped stash@{0} (' + item + '). Back to work!'];
          return s;
        }
        case 'branch_create': {
          const name = effect.arg || 'feature/login';
          if (!s.branches.includes(name)) s.branches.push(name);
          s.currentBranch = name;
          s.highlightStage = 'local';
          s.activeFlow = { from: 'local', to: 'workspace', direction: 'local', command: rawCommand, label: 'Switched to ' + name };
          s.terminalLines = ['$ ' + rawCommand, "Switched to a new branch '" + name + "'. Your main timeline stays untouched."];
          return s;
        }
        case 'branch_commit':
          s.localCommits.unshift({ id: 'f4e81c9', message: effect.arg || 'Build login form', branch: s.currentBranch, files: ['login.tsx'], author: s.config.name || 'Mamun' });
          if (!s.workspace.some(f => f.name === 'login.tsx')) s.workspace.push({ name: 'login.tsx', status: 'clean', detail: 'On ' + s.currentBranch });
          s.activeFlow = { from: 'staging', to: 'local', direction: 'forward', command: rawCommand, label: 'Committed on ' + s.currentBranch };
          s.highlightStage = 'local';
          s.terminalLines = ['$ ' + rawCommand, '[' + s.currentBranch + ' f4e81c9] ' + (effect.arg || 'Build login form')];
          return s;
        case 'branch_switch':
          s.currentBranch = effect.arg || 'main';
          s.highlightStage = 'local';
          s.activeFlow = { from: 'local', to: 'workspace', direction: 'local', command: rawCommand, label: 'HEAD -> ' + s.currentBranch };
          s.terminalLines = ['$ ' + rawCommand, "Switched to branch '" + s.currentBranch + "'. Workspace files updated."];
          return s;
        case 'branch_delete': {
          const target = effect.arg || 'feature/login';
          if (s.currentBranch === target) { s.terminalLines = ['$ ' + rawCommand, "Cannot delete '" + target + "' while standing on it. Switch to 'main' first!"]; return s; }
          s.branches = s.branches.filter(b => b !== target);
          s.highlightStage = 'local';
          s.terminalLines = ['$ ' + rawCommand, 'Deleted branch ' + target + ' (commit snapshots remain safely merged in main).'];
          return s;
        }
        case 'merge_ff':
          s.currentBranch = 'main';
          if (!s.localCommits.some(c => c.id === 'f4e81c9')) s.localCommits.unshift({ id: 'f4e81c9', message: 'Add dark theme toggle (Fast-Forward)', branch: 'main', files: ['theme.css'], author: 'Mamun' });
          s.activeFlow = { from: 'local', to: 'workspace', direction: 'forward', command: rawCommand, label: 'Fast-Forward Merge' };
          s.highlightStage = 'local';
          s.terminalLines = ['$ ' + rawCommand, 'Updating 2b4d9a1..f4e81c9 — Fast-forward!', 'No extra merge commit needed because main had no divergent commits.'];
          return s;
        case 'merge_3way':
          s.currentBranch = 'main';
          if (!s.localCommits.some(c => c.isMerge)) s.localCommits.unshift({ id: 'm9a2c41', message: "Merge branch 'feature/login' into main", branch: 'main', files: ['login.tsx'], author: 'Mamun', isMerge: true });
          s.activeFlow = { from: 'local', to: 'workspace', direction: 'forward', command: rawCommand, label: '3-Way Merge Commit' };
          s.highlightStage = 'local';
          s.terminalLines = ['$ ' + rawCommand, "Merge made by the 'ort' strategy -> commit m9a2c41.", 'Both main and feature/login histories are now joined with a merge commit.'];
          return s;
        case 'cherry_pick':
          if (!s.localCommits.some(c => c.id === 'p3c90d4')) s.localCommits.unshift({ id: 'p3c90d4', message: 'Cherry-pick hotfix (e7a11b2)', branch: s.currentBranch, files: ['navbar.tsx'], author: 'Mamun' });
          s.highlightStage = 'local';
          s.terminalLines = ['$ ' + rawCommand, '[' + s.currentBranch + ' p3c90d4] Applied single commit e7a11b2 cleanly onto ' + s.currentBranch + '.'];
          return s;
        case 'remote_add':
          s.remoteConnected = true;
          s.remoteUrl = 'git@github.com:dev/room.git';
          s.highlightStage = 'remote';
          s.activeFlow = { from: 'local', to: 'remote', direction: 'inspect', command: rawCommand, label: 'Linked alias "origin"' };
          s.terminalLines = ['$ ' + rawCommand, 'Remote "origin" linked -> ' + s.remoteUrl];
          return s;
        case 'ssh_keygen':
          s.sshReady = true;
          s.highlightStage = 'remote';
          s.terminalLines = ['$ ' + rawCommand, 'Generated Ed25519 keypair at ~/.ssh/id_ed25519 & id_ed25519.pub', 'Copied public key to GitHub SSH Settings — passwordless auth ready!'];
          return s;
        case 'push_origin':
          s.remoteConnected = true;
          s.remoteCommits = JSON.parse(JSON.stringify(s.localCommits));
          s.activeFlow = { from: 'local', to: 'remote', direction: 'forward', command: rawCommand, label: 'Uploaded Local -> GitHub' };
          s.highlightStage = 'remote';
          s.terminalLines = ['$ ' + rawCommand, 'Enumerating objects: ' + (s.localCommits.length * 3) + ', done.', "Branch '" + s.currentBranch + "' set up to track 'origin/" + s.currentBranch + "'."];
          return s;
        case 'clone_repo':
          s.initialized = true;
          s.remoteConnected = true;
          s.localCommits = JSON.parse(JSON.stringify(s.remoteCommits));
          s.workspace = [{ name: 'index.html', status: 'clean', detail: 'Cloned from GitHub' }, { name: 'app.js', status: 'clean', detail: 'Cloned from GitHub' }, { name: 'README.md', status: 'clean', detail: 'Cloned from GitHub' }];
          s.activeFlow = { from: 'remote', to: 'workspace', direction: 'backward', command: rawCommand, label: 'Cloned full repo + .git' };
          s.highlightStage = 'workspace';
          s.terminalLines = ['$ ' + rawCommand, "Cloning into 'room'... Receiving objects: 100%, done."];
          return s;
        case 'fetch_origin': {
          const inc = s.remoteCommits.find(rc => !s.localCommits.some(lc => lc.id === rc.id));
          if (inc) s.localCommits.unshift({ ...inc, branch: 'origin/main' });
          s.activeFlow = { from: 'remote', to: 'local', direction: 'backward', command: rawCommand, label: 'Remote -> Local Repo only' };
          s.highlightStage = 'local';
          s.terminalLines = ['$ ' + rawCommand, 'Fetched latest commits into origin/main inside Local Repo.', 'Notice: Your Workspace files were NOT overwritten yet — safe to inspect first!'];
          return s;
        }
        case 'pull_origin': {
          const miss = s.remoteCommits.filter(rc => !s.localCommits.some(lc => lc.id === rc.id));
          miss.reverse().forEach(c => s.localCommits.unshift({ ...c, branch: 'main' }));
          s.localCommits = s.localCommits.map(c => ({ ...c, branch: 'main' }));
          if (!s.workspace.some(f => f.name === 'api-fix.js')) s.workspace.push({ name: 'api-fix.js', status: 'clean', detail: 'Pulled from GitHub' });
          s.activeFlow = { from: 'remote', to: 'workspace', direction: 'backward', command: rawCommand, label: 'Fetch + Merge -> Workspace' };
          s.highlightStage = 'workspace';
          s.terminalLines = ['$ ' + rawCommand, 'Fast-forward merge complete! Remote commits are now live in Local Repo & Workspace.'];
          return s;
        }
        case 'revert_head': {
          const latest = s.localCommits[0];
          if (!latest || latest.isRevert) { s.terminalLines = ['$ ' + rawCommand, 'Latest commit is already reverted cleanly.']; return s; }
          s.localCommits.unshift({ id: 'r8d2f0a', message: 'Revert "' + latest.message + '"', branch: s.currentBranch, files: latest.files, author: 'Mamun', isRevert: true });
          s.activeFlow = { from: 'local', to: 'local', direction: 'forward', command: rawCommand, label: 'New inverse commit r8d2f0a' };
          s.highlightStage = 'local';
          s.terminalLines = ['$ ' + rawCommand, '[' + s.currentBranch + ' r8d2f0a] Revert "' + latest.message + '"', 'Safe undo! Old history stays intact so teammates experience zero conflicts.'];
          return s;
        }
        case 'push_revert':
          s.remoteCommits = JSON.parse(JSON.stringify(s.localCommits));
          s.activeFlow = { from: 'local', to: 'remote', direction: 'forward', command: rawCommand, label: 'Pushed safe revert commit' };
          s.highlightStage = 'remote';
          s.terminalLines = ['$ ' + rawCommand, 'Successfully pushed revert commit to origin/main without rewriting shared history!'];
          return s;
        default:
          return s;
      }
    }
`;

/**
 * Generates a 100% offline, self-contained single HTML file that mirrors the live
 * GitFrame studio 1-to-1 across all 4 views (Tutorial, Branch Lab + Sandbox,
 * Flow Matrix, Cheat Sheet) with all SVG arrowhead animations and a smooth funny loader.
 */
export function buildStandaloneOfflineHtml(): string {
  const safeJson = (obj: unknown) =>
    JSON.stringify(obj).replace(/<\//g, '<\\/');

  const reducerSource = OFFLINE_COMMAND_ENGINE_JS;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GitFrame — 100% Offline Interactive Git Visual Guide</title>
  <style>
    :root {
      --bg: #F8FAFC;
      --surface: #FFFFFF;
      --ink: #0F172A;
      --muted: #64748B;
      --border: #E2E8F0;
      --amber: #D97706;
      --sky: #0284C7;
      --emerald: #059669;
      --indigo: #4F46E5;
      --rose: #DC2626;
      --font-sans: 'Plus Jakarta Sans', 'Avenir Next', 'Segoe UI', system-ui, -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', 'SFMono-Regular', 'Cascadia Code', ui-monospace, Menlo, Consolas, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-sans);
      background: var(--bg);
      color: var(--ink);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    code, pre { font-family: var(--font-mono); }
    button { font-family: inherit; cursor: pointer; }

    /* ===== FUNNY GIT CCTV SPLASH LOADER ===== */
    #gf-loader {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(248, 250, 252, 0.98);
      backdrop-filter: blur(6px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 24px;
      transition: opacity 0.35s ease, transform 0.35s ease;
    }
    #gf-loader.done {
      opacity: 0;
      transform: scale(1.02);
      pointer-events: none;
    }
    .loader-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      padding: 28px 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
    }
    .loader-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0F172A;
      margin-top: 8px;
    }
    .loader-quip {
      font-family: var(--font-mono);
      font-size: 12px;
      color: #0369A1;
      margin-top: 8px;
      min-height: 20px;
    }
    .loader-bar-track {
      margin-top: 16px;
      height: 6px;
      background: #E2E8F0;
      border-radius: 999px;
      overflow: hidden;
    }
    .loader-bar-fill {
      height: 100%;
      width: 12%;
      background: linear-gradient(90deg, #0284C7, #059669, #4F46E5);
      border-radius: 999px;
      transition: width 0.22s ease-out;
    }
    .loader-skip {
      margin-top: 14px;
      background: none;
      border: none;
      font-size: 11.5px;
      color: #64748B;
      text-decoration: underline;
    }
    .loader-skip:hover { color: #0F172A; }
    @keyframes camBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.2; } }
    @keyframes camTilt { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
    @keyframes nodePop { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
    .cam-rec { animation: camBlink 0.7s infinite; }
    .cam-body { transform-origin: 88px 38px; animation: camTilt 1.4s ease-in-out infinite; }
    .pop-1 { animation: nodePop 0.9s ease-in-out infinite; }
    .pop-2 { animation: nodePop 0.9s ease-in-out 0.18s infinite; }
    .pop-3 { animation: nodePop 0.9s ease-in-out 0.36s infinite; }

    /* ===== MOTION & FLOW ANIMATIONS (SAME AS LIVE APP) ===== */
    @keyframes flowDashForward { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
    @keyframes flowDashBackward { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 24; } }
    @keyframes itemArrive {
      0% { opacity: 0; transform: translateY(-4px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes viewFade {
      0% { opacity: 0; transform: translateY(4px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .animate-flow-forward { stroke-dasharray: 6 6; animation: flowDashForward 0.65s linear infinite; }
    .animate-flow-backward { stroke-dasharray: 6 6; animation: flowDashBackward 0.65s linear infinite; }
    .animate-item-arrive { animation: itemArrive 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .view-enter { animation: viewFade 0.2s ease-out forwards; }
    @media (prefers-reduced-motion: reduce) {
      .animate-flow-forward, .animate-flow-backward, .animate-item-arrive,
      .cam-rec, .cam-body, .pop-1, .pop-2, .pop-3, .view-enter { animation: none !important; }
    }

    /* ===== LAYOUT & 100VH 45% / 55% SPLIT ===== */
    .tutorial-split {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
    }
    .visual-col, .theory-col {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    @media (min-width: 960px) {
      body.tutorial-vh { height: 100vh; overflow: hidden; }
      body.tutorial-vh .container { flex: 1; min-height: 0; overflow: hidden; padding: 12px 20px; gap: 10px; }
      body.tutorial-vh #view-tutorial { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px; }
      body.tutorial-vh .tutorial-split {
        flex: 1;
        min-height: 0;
        grid-template-columns: 45% 1fr;
        align-items: stretch;
      }
      body.tutorial-vh .visual-col { min-height: 0; overflow: hidden; }
      body.tutorial-vh .theory-col { min-height: 0; overflow: hidden; }
      body.tutorial-vh #command-deck-card { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
      body.tutorial-vh #command-deck-card .terminal { flex: 1; min-height: 56px; max-height: none; }
      body.tutorial-vh #theory-panel-card { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
      body.tutorial-vh .theory-scroll { flex: 1; min-height: 0; overflow-y: auto; padding-right: 6px; }
    }

    /* ===== HEADER ===== */
    .header {
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(6px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 20;
      flex-shrink: 0;
    }
    .header-inner {
      max-width: 1600px;
      margin: 0 auto;
      padding: 0 20px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    .brand { font-size: 16px; font-weight: 700; letter-spacing: -0.02em; white-space: nowrap; color: var(--ink); background: none; border: none; }
    .nav { display: flex; align-items: center; gap: 24px; overflow-x: auto; }
    .nav button {
      background: none;
      border: none;
      font-size: 13.5px;
      font-weight: 500;
      color: #475569;
      padding: 4px 0;
      border-bottom: 2px solid transparent;
      white-space: nowrap;
      transition: color 0.15s ease, border-color 0.15s ease;
    }
    .nav button:hover { color: var(--ink); border-bottom-color: #CBD5E1; }
    .nav button.active { color: var(--ink); border-bottom-color: var(--ink); font-weight: 600; }
    .offline-note { font-size: 12px; color: var(--emerald); font-weight: 600; white-space: nowrap; }

    /* ===== CONTAINERS & CARDS ===== */
    .container { width: 100%; max-width: 1600px; margin: 0 auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px 14px;
      flex-shrink: 0;
    }
    .card-lg { padding: 20px 24px; }
    .stack-6 { display: flex; flex-direction: column; gap: 22px; }

    /* ===== SIDE-BY-SIDE GROUPED 4-STAGE ARCHITECTURE ===== */
    .stages-scroll { overflow-x: auto; padding-bottom: 2px; }
    .stages-row {
      display: grid;
      grid-template-columns: minmax(0, 3fr) 22px minmax(0, 1fr);
      gap: 6px;
      align-items: stretch;
      min-width: 490px;
    }
    .local-folder-group {
      border: 1.5px dashed #CBD5E1;
      background: rgba(248, 250, 252, 0.85);
      border-radius: 10px;
      padding: 6px;
      display: flex;
      flex-direction: column;
    }
    .cloud-group {
      border: 1.5px solid #C7D2FE;
      background: rgba(238, 242, 255, 0.45);
      border-radius: 10px;
      padding: 6px;
      display: flex;
      flex-direction: column;
    }
    .group-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
      padding: 0 4px 6px;
      font-size: 10px;
      font-weight: 700;
      color: #334155;
    }
    .local-cards-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
      flex: 1;
      align-items: stretch;
    }
    .bridge-mid {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-size: 8.5px;
      font-weight: 700;
      gap: 2px;
      user-select: none;
    }
    .stage-box {
      border-radius: 8px;
      border: 1.5px solid var(--border);
      padding: 7px 8px;
      display: flex;
      flex-direction: column;
      min-width: 0;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .stage-box.hl { border-color: var(--ink); box-shadow: 0 0 0 2px rgba(15,23,42,0.12); }
    .stage-ws { background: #FFFDF9; border-color: #FDE68A; }
    .stage-st { background: #F9FCFF; border-color: #BAE6FD; }
    .stage-lo { background: #F8FDFB; border-color: #A7F3D0; }
    .stage-rm { background: #FAFAFF; border-color: #C7D2FE; flex: 1; }
    .stage-head {
      padding-bottom: 4px;
      margin-bottom: 4px;
      border-bottom: 1px solid rgba(15,23,42,0.06);
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 4px;
    }
    .stage-sub { font-size: 9.5px; font-weight: 600; color: var(--muted); display: block; margin-top: 1px; }
    .stage-body { flex: 1; font-size: 10.5px; min-height: 112px; max-height: 146px; overflow-y: auto; }
    .stage-foot {
      margin-top: 5px;
      padding-top: 4px;
      border-top: 1px solid #F1F5F9;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: var(--muted);
    }
    .file-row { padding: 3px 0; border-bottom: 1px solid #F1F5F9; }
    .file-row:last-child { border-bottom: none; }
    .file-name { font-family: var(--font-mono); font-weight: 600; color: var(--ink); font-size: 10.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .status-tag { font-size: 9.5px; font-weight: 600; display: block; }
    .st-untracked { color: #B45309; }
    .st-modified { color: #C2410C; }
    .st-staged { color: #0369A1; }
    .st-clean { color: #047857; }
    .st-deleted { color: #BE123C; }
    .st-ignored { color: #64748B; }
    .st-renamed { color: #4338CA; }
    .commit-row { padding: 3px 0; border-bottom: 1px solid #ECFDF5; }
    .commit-row:last-child { border-bottom: none; }
    .commit-id { font-family: var(--font-mono); font-size: 10px; font-weight: 700; color: #065F46; }
    .remote-commit-id { font-family: var(--font-mono); font-size: 10px; font-weight: 700; color: #3730A3; }
    .dotgit-btn {
      background: none;
      border: none;
      font-size: 10px;
      font-weight: 700;
      color: #047857;
      padding: 0 2px;
      line-height: 1;
    }

    /* ===== COMMAND DECK & TERMINAL ===== */
    .cmd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
    @media (max-width: 560px) { .cmd-grid { grid-template-columns: 1fr; } }
    .cmd-btn {
      text-align: left;
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 7px 10px;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .cmd-btn:hover { border-color: var(--sky); background: #F0F9FF; }
    .cmd-btn.undo:hover { border-color: var(--rose); background: #FFF1F2; }
    .cmd-btn.inspect:hover { border-color: var(--indigo); background: #EEF2FF; }
    .cmd-btn.active-do { border-color: var(--sky); background: #E0F2FE; }
    .cmd-btn.active-undo { border-color: var(--rose); background: #FFE4E6; }
    .cmd-btn.active-inspect { border-color: var(--indigo); background: #E0E7FF; }
    .cmd-meta { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; gap: 6px; }
    .cmd-code { font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--ink); line-height: 1.35; word-break: break-word; }
    .cmd-label { font-size: 10.5px; color: #475569; margin-top: 2px; line-height: 1.3; }
    .terminal {
      margin-top: 8px;
      background: #0F172A;
      color: #E2E8F0;
      border-radius: 8px;
      padding: 8px 12px;
      font-family: var(--font-mono);
      font-size: 11px;
      line-height: 1.45;
      max-height: 92px;
      overflow-y: auto;
    }
    .terminal .cmd-line { color: #7DD3FC; font-weight: 600; }
    .terminal .add-line { color: #34D399; }
    .terminal .del-line { color: #FB7185; }

    /* ===== THEORY PANEL ===== */
    .tabs { display: inline-flex; background: #F1F5F9; padding: 3px; border-radius: 8px; gap: 3px; flex-wrap: wrap; }
    .tab-btn {
      border: none;
      background: transparent;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      border-radius: 6px;
      white-space: nowrap;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .tab-btn:hover { color: var(--ink); }
    .tab-btn.active { background: #fff; color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
    .theory-stack { display: flex; flex-direction: column; gap: 20px; padding: 14px 2px 6px; }
    .theory-section h3 { font-size: 14px; font-weight: 700; color: var(--ink); margin-bottom: 6px; }
    .theory-section p { font-size: 15px; line-height: 1.72; color: #334155; }
    .theory-divider { border-top: 1px solid #F1F5F9; padding-top: 18px; }
    .tip-row {
      border-top: 1px solid #F1F5F9;
      padding-top: 16px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 14px;
      line-height: 1.65;
      color: #334155;
    }

    /* ===== STEP BAR WITH 16 PROGRESS SEGMENTS ===== */
    .step-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 9px 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      flex-shrink: 0;
      flex-wrap: wrap;
    }
    .progress-segs { display: flex; align-items: center; gap: 4px; }
    @media (max-width: 780px) { .progress-segs { display: none; } }
    .prog-seg {
      height: 6px;
      width: 12px;
      border: none;
      border-radius: 999px;
      background: #E2E8F0;
      transition: all 0.18s ease;
    }
    .prog-seg.done { background: #0EA5E9; }
    .prog-seg.cur { width: 24px; background: #0F172A; }

    /* ===== BUTTONS & TABLES ===== */
    .btn {
      border: 1px solid var(--border);
      background: #fff;
      color: var(--ink);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .btn:hover:not(:disabled) { background: #F8FAFC; }
    .btn-primary { background: var(--ink); color: #fff; border-color: var(--ink); }
    .btn-primary:hover:not(:disabled) { background: #1E293B; }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-sky { background: #F0F9FF; border-color: #BAE6FD; color: #0C4A6E; }
    .btn-sky:hover { background: #E0F2FE; }
    .btn-emerald { background: #ECFDF5; border-color: #A7F3D0; color: #064E3B; }
    .btn-emerald:hover { background: #D1FAE5; }
    .btn-indigo { background: #EEF2FF; border-color: #C7D2FE; color: #312E81; }
    .btn-indigo:hover { background: #E0E7FF; }
    .btn-rose { background: #FFF1F2; border-color: #FECDD3; color: #881337; }
    .btn-rose:hover { background: #FFE4E6; }

    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    th { text-align: left; font-size: 11.5px; color: var(--muted); padding: 10px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: #fff; font-weight: 600; }
    td { padding: 11px 10px; border-bottom: 1px solid #F1F5F9; vertical-align: top; line-height: 1.5; }
    tr:hover td { background: rgba(248, 250, 252, 0.7); }

    /* ===== FLOW MATRIX TWO-COLUMN GRID + SAFETY CALLOUT ===== */
    .fm-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      align-items: stretch;
    }
    @media (max-width: 900px) { .fm-two-col { grid-template-columns: 1fr; } }
    .fm-row-btn {
      width: 100%;
      text-align: left;
      background: transparent;
      border: none;
      border-bottom: 1px solid #F1F5F9;
      padding: 11px 10px;
      border-radius: 8px;
      transition: background 0.15s ease;
    }
    .fm-row-btn:last-child { border-bottom: none; }
    .fm-row-btn:hover { background: #F8FAFC; }
    .fm-row-btn.active-fwd { background: #F0F9FF; }
    .fm-row-btn.active-bwd { background: #FFF1F2; }
    .safety-box {
      background: rgba(255, 251, 235, 0.85);
      border: 1px solid #FDE68A;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 13px;
      color: #451A03;
      line-height: 1.6;
    }
    .inline-pill-code {
      font-family: var(--font-mono);
      font-size: 11.5px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #FDE68A;
      padding: 1px 6px;
      border-radius: 4px;
    }

    /* ===== CHEAT SHEET QUICK STRIP & FILTERS ===== */
    .quick-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid #F1F5F9;
    }
    @media (max-width: 900px) { .quick-strip { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 520px) { .quick-strip { grid-template-columns: 1fr; } }
    .quick-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .cat-btn {
      border: none;
      background: #F1F5F9;
      color: #334155;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .cat-btn:hover { background: #E2E8F0; }
    .cat-btn.active { background: #0F172A; color: #FFFFFF; }
    .search-wrap { position: relative; width: 290px; max-width: 100%; }
    .search-input {
      width: 100%;
      padding: 8px 12px 8px 34px;
      border: 1px solid var(--border);
      background: #F8FAFC;
      border-radius: 8px;
      font-size: 12.5px;
      color: var(--ink);
      outline: none;
    }
    .search-input:focus { background: #fff; border-color: var(--sky); }

    .hidden { display: none !important; }
    .footer {
      border-top: 1px solid var(--border);
      background: #FFFFFF;
      margin-top: auto;
    }
    .footer-inner {
      max-width: 1600px;
      margin: 0 auto;
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 12px;
      color: var(--muted);
    }
  </style>
</head>
<body class="tutorial-vh">
  <!-- FUNNY GIT-THEMED OFFLINE SPLASH LOADER -->
  <div id="gf-loader" role="status" aria-live="polite">
    <div class="loader-card">
      <svg viewBox="0 0 180 76" width="160" height="68" style="display:block;margin:0 auto;" aria-hidden="true">
        <!-- Branch rail -->
        <line x1="22" y1="58" x2="158" y2="58" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="4 4"/>
        <circle cx="48" cy="58" r="6" fill="#059669" class="pop-1"/>
        <circle cx="90" cy="58" r="6" fill="#0284C7" class="pop-2"/>
        <circle cx="132" cy="58" r="6" fill="#4F46E5" class="pop-3"/>
        <!-- Cute CCTV Camera Mounting -->
        <g class="cam-body">
          <rect x="64" y="14" width="48" height="24" rx="6" fill="#0F172A"/>
          <polygon points="112,20 128,15 128,37 112,32" fill="#334155"/>
          <circle cx="76" cy="26" r="3.5" fill="#EF4444" class="cam-rec"/>
          <rect x="86" y="21" width="18" height="10" rx="2" fill="#38BDF8" opacity="0.85"/>
        </g>
        <line x1="88" y1="38" x2="88" y2="48" stroke="#64748B" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <div class="loader-title">Booting GitFrame Studio</div>
      <div id="gf-loader-quip" class="loader-quip">$ Mounting CCTV camera inside .git/...</div>
      <div class="loader-bar-track"><div id="gf-loader-bar" class="loader-bar-fill"></div></div>
      <button type="button" class="loader-skip" onclick="dismissLoader()">Skip intro →</button>
    </div>
  </div>

  <header class="header">
    <div class="header-inner">
      <button type="button" class="brand" onclick="switchView('tutorial')">GitFrame</button>
      <nav class="nav" aria-label="Primary Views">
        <button id="nav-tutorial" class="active" onclick="switchView('tutorial')">Tutorial</button>
        <button id="nav-branch" onclick="switchView('branch')">Branch Lab</button>
        <button id="nav-matrix" onclick="switchView('matrix')">Flow Matrix</button>
        <button id="nav-cheatsheet" onclick="switchView('cheatsheet')">Cheat Sheet</button>
      </nav>
      <div class="offline-note">100% Offline Single-File Edition</div>
    </div>
  </header>

  <main class="container">
    <!-- VIEW 1: 16-STEP INTERACTIVE TUTORIAL (45% VISUAL / 55% THEORY) -->
    <div id="view-tutorial">
      <div class="tutorial-split">
        <div class="visual-col">
          <div class="card" id="stage-diagram-card"></div>
          <div class="card" id="command-deck-card"></div>
        </div>
        <div class="theory-col">
          <div class="card" id="theory-panel-card" style="padding:18px 22px;"></div>
        </div>
      </div>
      <div class="step-bar">
        <button class="btn" id="btn-prev" onclick="goStep(currentStep - 1)">← Previous</button>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <span id="step-counter" style="font-size:12.5px;font-weight:700;font-variant-numeric:tabular-nums;">Step 1 of 16</span>
          <div id="progress-segs" class="progress-segs" aria-label="Course progress"></div>
          <select id="step-select" onchange="goStep(Number(this.value))" style="padding:5px 10px;border:1px solid #CBD5E1;border-radius:8px;font-size:12px;background:#F8FAFC;max-width:230px;"></select>
        </div>
        <button class="btn btn-primary" id="btn-next" onclick="goStep(currentStep + 1)">Next →</button>
      </div>
    </div>

    <!-- VIEW 2: BRANCH LAB & LIVE PLAYGROUND -->
    <div id="view-branch" class="hidden stack-6"></div>

    <!-- VIEW 3: FLOW MATRIX (SAME AS LIVE APP) -->
    <div id="view-matrix" class="hidden stack-6"></div>

    <!-- VIEW 4: CHEAT SHEET (SAME AS LIVE APP) -->
    <div id="view-cheatsheet" class="hidden stack-6"></div>
  </main>

  <footer id="app-footer" class="footer hidden">
    <div class="footer-inner">
      <span>GitFrame — Visual 4-Stage Git Learning Studio</span>
      <span>Zero external dependencies · 100% offline single-file HTML</span>
    </div>
  </footer>

  <script>
    const LESSONS = ${safeJson(LESSONS)};
    const FLOW_ROWS = ${safeJson(STAGE_FLOW_ROWS)};
    const CHEAT_SHEET = ${safeJson(CHEAT_SHEET)};

    ${reducerSource}

    /* ===== FUNNY LOADER CONTROLLER ===== */
    const LOADER_QUIPS = [
      '$ Mounting CCTV camera inside .git/...',
      '$ Politely asking HEAD not to detach...',
      '$ Hiding secrets.env behind .gitignore...',
      '$ Bribing git merge to avoid conflicts...',
      '$ All 16 lessons loaded — zero Wi-Fi needed!'
    ];
    let loaderDone = false;
    function dismissLoader() {
      if (loaderDone) return;
      loaderDone = true;
      const el = document.getElementById('gf-loader');
      if (!el) return;
      el.classList.add('done');
      setTimeout(() => { el.style.display = 'none'; }, 360);
    }
    (function runLoader() {
      const bar = document.getElementById('gf-loader-bar');
      const quip = document.getElementById('gf-loader-quip');
      const steps = [24, 52, 78, 100];
      steps.forEach((pct, idx) => {
        setTimeout(() => {
          if (loaderDone) return;
          if (bar) bar.style.width = pct + '%';
          if (quip) quip.textContent = LOADER_QUIPS[Math.min(idx + 1, LOADER_QUIPS.length - 1)];
        }, 180 * (idx + 1));
      });
      setTimeout(dismissLoader, 920);
    })();

    /* ===== APP STATE ===== */
    let currentView = 'tutorial';
    let currentStep = 0;
    let currentState = JSON.parse(JSON.stringify(LESSONS[0].initialState));
    let historyStack = [];
    let lastCmdId = null;
    let theoryTab = 'story';
    let inspectDotGit = false;

    // Flow Matrix state
    let selectedFlowId = FLOW_ROWS[0].id;

    // Cheat Sheet state
    let cheatCategory = 'All';
    let cheatQuery = '';
    let copiedCmd = null;

    // Branch Lab state (Part 1: 4 Merge Types + Part 2: Live Sandbox)
    let mergeMode = 'fast-forward';
    let mergeApplied = false;
    const INITIAL_SANDBOX = [
      { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
      { id: 'c2', label: 'c2 Base', lane: 0, col: 1, parents: ['c1'] }
    ];
    let sandboxCommits = JSON.parse(JSON.stringify(INITIAL_SANDBOX));
    let sandboxHeads = { main: 'c2' };
    let sandboxActiveBranch = 'main';
    let sandboxLog = 'Ready — create a feature branch, add commits, switch branches, or merge!';

    const MERGE_SCENARIOS = {
      'fast-forward': {
        title: 'Fast-Forward Merge',
        command: 'git checkout main && git merge feature',
        whenItHappens: 'No new commits were added to main after you created the feature branch.',
        result: 'Git simply slides the main pointer straight forward to match feature. Zero extra merge commits, completely linear history.',
        beforeCommits: [
          { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
          { id: 'c2', label: 'c2 Layout', lane: 0, col: 1, parents: ['c1'] },
          { id: 'f1', label: 'f1 Nav', lane: 1, col: 2, parents: ['c2'] },
          { id: 'f2', label: 'f2 Auth', lane: 1, col: 3, parents: ['f1'] }
        ],
        afterCommits: [
          { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
          { id: 'c2', label: 'c2 Layout', lane: 0, col: 1, parents: ['c1'] },
          { id: 'f1', label: 'f1 Nav', lane: 0, col: 2, parents: ['c2'] },
          { id: 'f2', label: 'f2 Auth', lane: 0, col: 3, parents: ['f1'] }
        ],
        beforeHeads: { main: 'c2', feature: 'f2' },
        afterHeads: { main: 'f2', feature: 'f2' }
      },
      'three-way': {
        title: '3-Way Merge Commit',
        command: 'git checkout main && git merge feature',
        whenItHappens: 'Both main AND feature received new commits after diverging from their common ancestor (c2).',
        result: 'Git creates a brand-new Merge Commit (m1) with TWO parents (c3 and f2), preserving exact branch history.',
        beforeCommits: [
          { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
          { id: 'c2', label: 'c2 Base', lane: 0, col: 1, parents: ['c1'] },
          { id: 'c3', label: 'c3 Hotfix', lane: 0, col: 2, parents: ['c2'] },
          { id: 'f1', label: 'f1 Cart', lane: 1, col: 2, parents: ['c2'] },
          { id: 'f2', label: 'f2 Pay', lane: 1, col: 3, parents: ['f1'] }
        ],
        afterCommits: [
          { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
          { id: 'c2', label: 'c2 Base', lane: 0, col: 1, parents: ['c1'] },
          { id: 'c3', label: 'c3 Hotfix', lane: 0, col: 2, parents: ['c2'] },
          { id: 'f1', label: 'f1 Cart', lane: 1, col: 2, parents: ['c2'] },
          { id: 'f2', label: 'f2 Pay', lane: 1, col: 3, parents: ['f1'] },
          { id: 'm1', label: 'm1 Merge', lane: 0, col: 4, parents: ['c3', 'f2'], isMerge: true }
        ],
        beforeHeads: { main: 'c3', feature: 'f2' },
        afterHeads: { main: 'm1', feature: 'f2' }
      },
      'rebase': {
        title: 'Rebase (Linear Replay)',
        command: 'git checkout feature && git rebase main',
        whenItHappens: 'You want to replay your unpushed feature commits cleanly on top of the latest main without a merge bubble.',
        result: "Git replays f1 and f2 as brand-new commits (f1', f2') directly ahead of c3. Never rebase shared/pushed branches!",
        beforeCommits: [
          { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
          { id: 'c2', label: 'c2 Base', lane: 0, col: 1, parents: ['c1'] },
          { id: 'c3', label: 'c3 Hotfix', lane: 0, col: 2, parents: ['c2'] },
          { id: 'f1', label: 'f1 UI', lane: 1, col: 2, parents: ['c2'] },
          { id: 'f2', label: 'f2 Test', lane: 1, col: 3, parents: ['f1'] }
        ],
        afterCommits: [
          { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
          { id: 'c2', label: 'c2 Base', lane: 0, col: 1, parents: ['c1'] },
          { id: 'c3', label: 'c3 Hotfix', lane: 0, col: 2, parents: ['c2'] },
          { id: 'f1p', label: "f1' UI", lane: 0, col: 3, parents: ['c3'], isRebased: true },
          { id: 'f2p', label: "f2' Test", lane: 0, col: 4, parents: ['f1p'], isRebased: true }
        ],
        beforeHeads: { main: 'c3', feature: 'f2' },
        afterHeads: { main: 'c3', feature: 'f2p' }
      },
      'cherry-pick': {
        title: 'Cherry-Pick Single Commit',
        command: 'git checkout main && git cherry-pick f2',
        whenItHappens: 'You only need ONE bug-fix commit (f2) from an unfinished feature branch — without merging the rest of feature.',
        result: "Git copies only commit f2 and applies it onto main as a new snapshot (f2'), leaving f1 behind on feature.",
        beforeCommits: [
          { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
          { id: 'c2', label: 'c2 Base', lane: 0, col: 1, parents: ['c1'] },
          { id: 'c3', label: 'c3 Docs', lane: 0, col: 2, parents: ['c2'] },
          { id: 'f1', label: 'f1 WIP', lane: 1, col: 2, parents: ['c2'] },
          { id: 'f2', label: 'f2 Fix', lane: 1, col: 3, parents: ['f1'] }
        ],
        afterCommits: [
          { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
          { id: 'c2', label: 'c2 Base', lane: 0, col: 1, parents: ['c1'] },
          { id: 'c3', label: 'c3 Docs', lane: 0, col: 2, parents: ['c2'] },
          { id: 'f1', label: 'f1 WIP', lane: 1, col: 2, parents: ['c2'] },
          { id: 'f2', label: 'f2 Fix', lane: 1, col: 3, parents: ['f1'] },
          { id: 'cp', label: "f2' Pick", lane: 0, col: 4, parents: ['c3'], isCherry: true }
        ],
        beforeHeads: { main: 'c3', feature: 'f2' },
        afterHeads: { main: 'cp', feature: 'f2' }
      }
    };

    const PIPELINE_X = { workspace: 76, staging: 218, local: 360, remote: 530 };
    const FM_BOX_CENTERS = { workspace: 125, staging: 365, local: 605, remote: 865 };

    function esc(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function fmt(s) {
      return esc(s)
        .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong style="font-weight:600;color:#0F172A;">$1</strong>')
        .replace(/\`([^\`]+)\`/g, '<code style="background:#F1F5F9;padding:1px 5px;border-radius:4px;font-size:12px;color:#0F172A;">$1</code>');
    }

    function switchView(v) {
      currentView = v;
      document.body.classList.toggle('tutorial-vh', v === 'tutorial');
      document.getElementById('app-footer').classList.toggle('hidden', v === 'tutorial');
      ['tutorial','branch','matrix','cheatsheet'].forEach(k => {
        const el = document.getElementById('view-' + k);
        el.classList.toggle('hidden', k !== v);
        if (k === v) {
          el.classList.remove('view-enter');
          void el.offsetWidth;
          el.classList.add('view-enter');
        }
        document.getElementById('nav-' + k).classList.toggle('active', k === v);
      });
      if (v === 'branch') renderBranchLab();
      if (v === 'matrix') renderFlowMatrix();
      if (v === 'cheatsheet') renderCheatSheet();
      window.scrollTo({ top: 0 });
    }

    function initStepSelector() {
      const sel = document.getElementById('step-select');
      sel.innerHTML = LESSONS.map((l, i) =>
        '<option value="' + i + '">' + l.stepNumber + '. ' + esc(l.title) + '</option>'
      ).join('');
    }

    function renderProgressSegments() {
      const wrap = document.getElementById('progress-segs');
      wrap.innerHTML = LESSONS.map((l, idx) => {
        const cls = 'prog-seg' + (idx === currentStep ? ' cur' : idx < currentStep ? ' done' : '');
        return '<button type="button" class="' + cls + '" title="Step ' + l.stepNumber + ': ' + esc(l.title) + '" onclick="goStep(' + idx + ')"></button>';
      }).join('');
    }

    function goStep(idx) {
      if (idx < 0 || idx >= LESSONS.length) return;
      currentStep = idx;
      currentState = JSON.parse(JSON.stringify(LESSONS[idx].initialState));
      historyStack = [];
      lastCmdId = null;
      theoryTab = 'story';
      inspectDotGit = false;
      document.getElementById('step-select').value = String(idx);
      renderTutorial();
    }

    function execCmd(cmdId) {
      const lesson = LESSONS[currentStep];
      const cmd = lesson.commands.find(c => c.id === cmdId);
      if (!cmd) return;
      historyStack.push(JSON.parse(JSON.stringify(currentState)));
      currentState = runCommandEffect(currentState, cmd.effect, cmd.command);
      lastCmdId = cmdId;
      renderTutorial();
    }

    function undoClick() {
      if (!historyStack.length) return;
      currentState = historyStack.pop();
      lastCmdId = null;
      renderTutorial();
    }

    function resetStage() {
      currentState = JSON.parse(JSON.stringify(LESSONS[currentStep].initialState));
      historyStack = [];
      lastCmdId = null;
      renderTutorial();
    }

    function toggleDotGit() {
      inspectDotGit = !inspectDotGit;
      renderStageDiagram();
    }

    function setTheoryTab(tab) {
      theoryTab = tab;
      renderTheoryPanel();
    }

    /* ===== VIEW 1: TUTORIAL (SAME AS LIVE APP) ===== */
    function renderStageDiagram() {
      const s = currentState;
      const f = s.activeFlow;
      const dotNodes = [
        { id: 'workspace', x: 76, col: '#D97706' },
        { id: 'staging', x: 218, col: '#0284C7' },
        { id: 'local', x: 360, col: '#059669' },
        { id: 'remote', x: 530, col: '#4F46E5' },
      ];

      let arcSvg = '';
      if (f && f.from !== f.to) {
        const x1 = PIPELINE_X[f.from], x2 = PIPELINE_X[f.to], mx = (x1 + x2) / 2;
        const isBack = f.direction === 'backward';
        const isInsp = f.direction === 'inspect';
        const col = isBack ? '#DC2626' : isInsp ? '#4F46E5' : '#0284C7';
        const marker = isBack ? 'url(#st-arrow-bwd)' : isInsp ? 'url(#st-arrow-insp)' : 'url(#st-arrow-fwd)';
        const animCls = isBack ? 'animate-flow-backward' : 'animate-flow-forward';
        const rx = Math.max(8, Math.min(352, mx - 120));
        const tx = Math.max(128, Math.min(472, mx));
        arcSvg = '<path d="M ' + x1 + ' 35 Q ' + mx + ' 4 ' + x2 + ' 35" fill="none" stroke="' + col + '" stroke-width="2.4" class="' + animCls + '" marker-end="' + marker + '"/>'
          + '<rect x="' + rx + '" y="0" width="240" height="19" rx="4" fill="#fff" stroke="' + col + '"/>'
          + '<text x="' + tx + '" y="13" text-anchor="middle" font-size="10" font-weight="700" fill="' + col + '">' + esc((isBack ? '← ' : '→ ') + f.label) + '</text>';
      } else {
        arcSvg = '<text x="300" y="16" text-anchor="middle" font-size="10.5" font-weight="500" fill="' + (f ? '#0F172A' : '#64748B') + '">' + esc(f ? f.label : 'Click any command below to watch changes flow across all 4 stages') + '</text>';
      }

      const dotsSvg = dotNodes.map(n => {
        const active = s.highlightStage === n.id || (f && (f.from === n.id || f.to === n.id));
        return '<circle cx="' + n.x + '" cy="35" r="' + (active ? 4.5 : 3) + '" fill="' + (active ? n.col : '#CBD5E1') + '"/>';
      }).join('');

      const svgHtml = '<svg viewBox="0 0 600 40" style="width:100%;height:40px;display:block;margin-bottom:4px;overflow:visible;">'
        + '<defs>'
        +   '<marker id="st-arrow-fwd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#0284C7"/></marker>'
        +   '<marker id="st-arrow-bwd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#DC2626"/></marker>'
        +   '<marker id="st-arrow-insp" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#4F46E5"/></marker>'
        + '</defs>'
        + '<line x1="76" y1="35" x2="530" y2="35" stroke="#E2E8F0" stroke-width="1.5" stroke-dasharray="4 4"/>'
        + dotsSvg
        + arcSvg
        + '</svg>';

      const statusLabel = {
        untracked: 'Untracked',
        modified: 'Modified',
        staged: 'Staged',
        clean: 'Clean',
        deleted: 'Deleted',
        ignored: 'Ignored',
        renamed: 'Renamed'
      };

      const renderFiles = (list, emptyMsg) => {
        if (!list.length) return '<div style="color:#94A3B8;text-align:center;padding:30px 4px;font-size:10px;">' + emptyMsg + '</div>';
        return list.map(file =>
          '<div class="file-row animate-item-arrive" title="' + esc(file.name + (file.detail ? ' — ' + file.detail : '')) + '">'
          + '<div class="file-name">' + esc(file.name) + '</div>'
          + '<span class="status-tag st-' + esc(file.status) + '">' + esc(statusLabel[file.status] || file.status) + '</span>'
          + '</div>'
        ).join('');
      };

      const renderCommits = (list, cls, emptyMsg) => {
        if (!list.length) return '<div style="color:#94A3B8;text-align:center;padding:24px 4px;font-size:10px;">' + emptyMsg + '</div>';
        return list.slice(0, 4).map(c =>
          '<div class="commit-row animate-item-arrive" title="' + esc(c.id + ': ' + c.message) + '"><div class="' + cls + '">● ' + esc(c.id) + '</div>'
          + '<div style="font-size:10px;color:#334155;line-height:1.25;">' + esc(c.message) + '</div></div>'
        ).join('');
      };

      const stashHtml = s.stash.length
        ? '<div style="margin-top:5px;padding-top:4px;border-top:1px solid #FDE68A;font-size:9.5px;color:#92400E;" title="' + esc(s.stash[0]) + '"><strong>Stash (1)</strong></div>'
        : '';

      const dotGitPanel = (s.initialized && inspectDotGit)
        ? '<div style="margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid #D1FAE5;font-size:9px;font-family:var(--font-mono);color:#475569;"><div>user: ' + esc(s.config.name || '(unset)') + '</div><div>refs: ' + esc(s.branches.join(', ')) + '</div></div>'
        : '';

      document.getElementById('stage-diagram-card').innerHTML = svgHtml
        + '<div class="stages-scroll"><div class="stages-row">'
        +   '<div class="local-folder-group">'
        +     '<div class="group-bar"><span style="font-family:var(--font-mono);">📁 my-project/ <span style="font-family:var(--font-sans);font-weight:500;color:#64748B;">Same Local Folder (contains .git/)</span></span><span style="text-transform:uppercase;font-size:9px;color:#64748B;">Your PC</span></div>'
        +     '<div class="local-cards-3">'
        +       '<div class="stage-box stage-ws ' + (s.highlightStage === 'workspace' ? 'hl' : '') + '">'
        +         '<div class="stage-head"><div>Workspace<span class="stage-sub" style="color:#92400E;">Your Room</span></div></div>'
        +         '<div class="stage-body">' + renderFiles(s.workspace, 'No files') + stashHtml + '</div>'
        +         '<div class="stage-foot"><span>Files</span><span>' + s.workspace.length + '</span></div>'
        +       '</div>'
        +       '<div class="stage-box stage-st ' + (s.highlightStage === 'staging' ? 'hl' : '') + '">'
        +         '<div class="stage-head"><div>Staging<span class="stage-sub" style="color:#075985;">.git/index</span></div></div>'
        +         '<div class="stage-body">' + renderFiles(s.staging, 'Empty<br/><span style="font-family:var(--font-mono);color:#0284C7;">git add</span>') + '</div>'
        +         '<div class="stage-foot"><span>Staged</span><span>' + s.staging.length + '</span></div>'
        +       '</div>'
        +       '<div class="stage-box stage-lo ' + (s.highlightStage === 'local' ? 'hl' : '') + '">'
        +         '<div class="stage-head"><div>Local Repo<span class="stage-sub" style="color:#065F46;">.git/objects</span></div>'
        +           (s.initialized ? '<button type="button" class="dotgit-btn" title="Inspect .git internals" onclick="toggleDotGit()">' + (inspectDotGit ? '▲' : '▼') + '</button>' : '')
        +         '</div>'
        +         '<div style="font-size:9.5px;font-family:var(--font-mono);font-weight:700;color:' + (s.initialized ? '#059669' : '#64748B') + ';margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'
        +           (s.initialized ? 'HEAD → ' + esc(s.headDetachedAt ? '@' + s.headDetachedAt : s.currentBranch) : 'No .git')
        +         '</div>'
        +         dotGitPanel
        +         '<div class="stage-body">' + renderCommits(s.localCommits, 'commit-id', s.initialized ? '0 commits' : 'git init') + '</div>'
        +         '<div class="stage-foot"><span>' + s.branches.length + ' branch</span><span>' + s.localCommits.length + '</span></div>'
        +       '</div>'
        +     '</div>'
        +   '</div>'
        +   '<div class="bridge-mid"><span style="color:#0284C7;">push</span><span style="color:#0284C7;font-size:12px;">→</span><span style="color:#4F46E5;font-size:12px;">←</span><span style="color:#4F46E5;">pull</span></div>'
        +   '<div class="cloud-group">'
        +     '<div class="group-bar"><span style="color:#312E81;">☁ GitHub</span><span style="text-transform:uppercase;font-size:9px;color:#4F46E5;">Cloud</span></div>'
        +     '<div class="stage-box stage-rm ' + (s.highlightStage === 'remote' ? 'hl' : '') + '">'
        +       '<div class="stage-head"><div>Remote Repo<span class="stage-sub" style="color:#4338CA;">' + (s.remoteConnected ? 'origin linked' : 'offline') + '</span></div></div>'
        +       (s.sshReady ? '<div style="font-size:9.5px;font-weight:600;color:#4338CA;padding-bottom:4px;margin-bottom:4px;border-bottom:1px solid #E0E7FF;">🔑 SSH Ready</div>' : '')
        +       '<div class="stage-body">' + renderCommits(s.remoteCommits, 'remote-commit-id', s.remoteConnected ? 'git push' : 'Not linked') + '</div>'
        +       '<div class="stage-foot"><span>Vault</span><span>' + s.remoteCommits.length + '</span></div>'
        +     '</div>'
        +   '</div>'
        + '</div></div>';
    }

    function renderCommandDeck() {
      const lesson = LESSONS[currentStep];
      const btns = lesson.commands.map(cmd => {
        const isLast = lastCmdId === cmd.id;
        const kindCls = cmd.kind === 'undo' ? 'undo' : cmd.kind === 'inspect' ? 'inspect' : '';
        const activeCls = isLast ? (cmd.kind === 'undo' ? 'active-undo' : cmd.kind === 'inspect' ? 'active-inspect' : 'active-do') : '';
        const tagColor = cmd.kind === 'undo' ? '#BE123C' : cmd.kind === 'inspect' ? '#4338CA' : '#0369A1';
        const tagText = cmd.kind === 'undo' ? '← Undo' : cmd.kind === 'inspect' ? '◉ Inspect' : '▶ Do';
        return '<button class="cmd-btn ' + kindCls + ' ' + activeCls + '" onclick="execCmd(\\'' + cmd.id + '\\')">'
          + '<div class="cmd-meta"><strong style="color:' + tagColor + ';">' + tagText + '</strong><span style="color:#64748B;">' + esc(cmd.routeLabel) + '</span></div>'
          + '<div class="cmd-code">' + esc(cmd.command) + '</div>'
          + '<div class="cmd-label">' + esc(cmd.label) + '</div>'
          + '</button>';
      }).join('');

      const term = currentState.terminalLines.map(line => {
        const cls = line.startsWith('$') ? 'cmd-line' : line.startsWith('+') ? 'add-line' : line.startsWith('-') ? 'del-line' : '';
        return '<div class="' + cls + '">' + esc(line) + '</div>';
      }).join('');

      document.getElementById('command-deck-card').innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding-bottom:6px;border-bottom:1px solid #F1F5F9;flex-shrink:0;">'
        + '<h2 style="font-size:12.5px;font-weight:700;">Clickable Commands</h2>'
        + '<div style="display:flex;gap:6px;">'
        + '<button class="btn" style="padding:4px 9px;font-size:11px;" onclick="undoClick()" ' + (!historyStack.length ? 'disabled' : '') + '>↩ Undo</button>'
        + '<button class="btn" style="padding:4px 9px;font-size:11px;" onclick="resetStage()">↺ Reset</button>'
        + '</div></div>'
        + '<div class="cmd-grid" style="flex-shrink:0;">' + btns + '</div>'
        + '<div class="terminal">' + term + '</div>';
    }

    function renderTheoryPanel() {
      const l = LESSONS[currentStep];
      let body = '';
      if (theoryTab === 'story') {
        body = '<div class="theory-stack">'
          + '<div class="theory-section">'
          +   '<h3>' + esc(l.storyTitle) + '</h3>'
          +   '<p>' + fmt(l.storyText) + '</p>'
          + '</div>'
          + '<div class="theory-section theory-divider">'
          +   '<h3>How Git Works Under the Hood</h3>'
          +   '<p style="white-space:pre-line;">' + fmt(l.theorySummary) + '</p>'
          + '</div>'
          + '<div class="tip-row">'
          +   '<span style="font-size:16px;line-height:1.2;">💡</span>'
          +   '<div><strong style="color:#0F172A;">Practical Tip:</strong> ' + fmt(l.proTip) + '</div>'
          + '</div>'
          + '</div>';
      } else if (theoryTab === 'vocabulary') {
        body = '<table><thead><tr><th style="width:28%;">Term</th><th style="width:38%;">Technical Meaning</th><th>CCTV Room Analogy</th></tr></thead><tbody>'
          + l.vocabulary.map(v => '<tr><td><strong style="color:#0F172A;">' + esc(v.term) + '</strong></td><td>' + fmt(v.meaning) + '</td><td style="color:#475569;">' + fmt(v.analogy) + '</td></tr>').join('')
          + '</tbody></table>';
      } else {
        body = '<table><thead><tr><th>Flag</th><th>Example</th><th>What It Does</th><th>Best Way to Use</th></tr></thead><tbody>'
          + l.flags.map(f => '<tr><td><code style="color:#075985;font-weight:700;white-space:nowrap;">' + esc(f.flag) + '</code></td><td><code style="white-space:nowrap;">' + esc(f.syntax) + '</code></td><td>' + fmt(f.purpose) + '</td><td style="color:#475569;">' + fmt(f.bestPractice) + '</td></tr>').join('')
          + '</tbody></table>';
      }

      document.getElementById('theory-panel-card').innerHTML =
        '<div style="display:flex;flex-direction:column;gap:12px;padding-bottom:14px;border-bottom:1px solid #F1F5F9;flex-shrink:0;">'
        + '<div>'
        +   '<div style="font-size:12px;color:#64748B;">Step ' + l.stepNumber + ' · ' + esc(l.category) + '</div>'
        +   '<h2 style="font-size:20px;font-weight:700;letter-spacing:-0.02em;margin-top:2px;color:#0F172A;">' + esc(l.title) + '</h2>'
        +   '<p style="font-size:13.5px;color:#475569;margin-top:3px;">' + esc(l.subtitle) + '</p>'
        + '</div>'
        + '<div class="tabs" style="align-self:flex-start;">'
        + '<button class="tab-btn ' + (theoryTab === 'story' ? 'active' : '') + '" onclick="setTheoryTab(\\'story\\')">Story &amp; Concept</button>'
        + '<button class="tab-btn ' + (theoryTab === 'vocabulary' ? 'active' : '') + '" onclick="setTheoryTab(\\'vocabulary\\')">Vocabulary (' + l.vocabulary.length + ')</button>'
        + '<button class="tab-btn ' + (theoryTab === 'flags' ? 'active' : '') + '" onclick="setTheoryTab(\\'flags\\')">Flags &amp; Best Use (' + l.flags.length + ')</button>'
        + '</div></div>'
        + '<div class="theory-scroll">' + body + '</div>';
    }

    function renderTutorial() {
      renderStageDiagram();
      renderCommandDeck();
      renderTheoryPanel();
      renderProgressSegments();
      document.getElementById('step-counter').textContent = 'Step ' + (currentStep + 1) + ' of ' + LESSONS.length;
      document.getElementById('btn-prev').disabled = currentStep === 0;
      document.getElementById('btn-next').disabled = currentStep === LESSONS.length - 1;
    }

    /* ===== VIEW 2: BRANCH LAB + LIVE SANDBOX (1-TO-1 MATCH) ===== */
    function buildCommitGraphSvg(commits, heads, activeBranch) {
      const colSpacing = 148, startX = 76;
      const laneY = lane => (lane === 0 ? 74 : 158);
      const posById = {};
      commits.forEach(c => { posById[c.id] = { x: startX + c.col * colSpacing, y: laneY(c.lane) }; });
      const maxCol = Math.max(4, ...commits.map(c => c.col));
      const width = Math.max(760, startX * 2 + maxCol * colSpacing);

      let edgesSvg = '';
      commits.forEach(c => {
        const to = posById[c.id];
        c.parents.forEach(pid => {
          const from = posById[pid];
          if (!from) return;
          const isCross = from.y !== to.y;
          const midX = (from.x + to.x) / 2;
          const d = isCross
            ? 'M ' + from.x + ' ' + from.y + ' C ' + midX + ' ' + from.y + ', ' + midX + ' ' + to.y + ', ' + to.x + ' ' + to.y
            : 'M ' + from.x + ' ' + from.y + ' L ' + to.x + ' ' + to.y;
          const col = c.isMerge ? '#4F46E5' : c.lane === 1 ? '#0284C7' : '#059669';
          edgesSvg += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.5" stroke-linecap="round"/>';
        });
      });

      let nodesSvg = '';
      commits.forEach(c => {
        const pos = posById[c.id];
        const isMain = heads.main === c.id;
        const isFeat = heads.feature === c.id;
        const fill = c.isMerge ? '#4F46E5' : c.isCherry ? '#D97706' : c.isRebased ? '#0284C7' : c.lane === 1 ? '#0284C7' : '#059669';
        nodesSvg += '<g>'
          + '<circle cx="' + pos.x + '" cy="' + pos.y + '" r="17" fill="#FFFFFF" stroke="' + fill + '" stroke-width="3"/>'
          + '<circle cx="' + pos.x + '" cy="' + pos.y + '" r="6" fill="' + fill + '"/>'
          + '<text x="' + pos.x + '" y="' + (pos.y + 34) + '" text-anchor="middle" font-size="11" font-weight="600" fill="#0F172A" font-family="monospace">' + esc(c.label) + '</text>';
        if (isMain) {
          nodesSvg += '<g transform="translate(' + pos.x + ',' + (pos.y - 42) + ')">'
            + '<rect x="-34" y="-12" width="68" height="22" rx="4" fill="' + (activeBranch === 'main' ? '#0F172A' : '#059669') + '"/>'
            + '<text x="0" y="3" text-anchor="middle" font-size="11" font-weight="600" fill="#FFFFFF" font-family="monospace">' + (activeBranch === 'main' ? 'HEAD:main' : 'main') + '</text>'
            + '</g>';
        }
        if (isFeat) {
          const fy = isMain ? pos.y - 68 : pos.y - 42;
          nodesSvg += '<g transform="translate(' + pos.x + ',' + fy + ')">'
            + '<rect x="-42" y="-12" width="84" height="22" rx="4" fill="' + (activeBranch === 'feature' ? '#0F172A' : '#0284C7') + '"/>'
            + '<text x="0" y="3" text-anchor="middle" font-size="11" font-weight="600" fill="#FFFFFF" font-family="monospace">' + (activeBranch === 'feature' ? 'HEAD:feat' : 'feature') + '</text>'
            + '</g>';
        }
        nodesSvg += '</g>';
      });

      return '<div style="overflow-x:auto;"><svg viewBox="0 0 ' + width + ' 225" style="width:100%;min-width:640px;height:220px;display:block;">'
        + '<line x1="28" y1="74" x2="' + (width - 28) + '" y2="74" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4 4"/>'
        + '<line x1="28" y1="158" x2="' + (width - 28) + '" y2="158" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4 4"/>'
        + '<text x="16" y="42" font-size="11" font-weight="600" fill="#059669">main lane</text>'
        + '<text x="16" y="196" font-size="11" font-weight="600" fill="#0284C7">feature lane</text>'
        + edgesSvg + nodesSvg + '</svg></div>';
    }

    function sbNextCol() { return Math.max(...sandboxCommits.map(c => c.col)) + 1; }
    function sbCreateBranch() {
      if (sandboxHeads.feature) { sandboxLog = 'Branch "feature" already exists. Switch to it or commit on it!'; renderBranchLab(); return; }
      sandboxHeads.feature = sandboxHeads.main;
      sandboxActiveBranch = 'feature';
      sandboxLog = '$ git checkout -b feature — Created and switched to feature branch.';
      renderBranchLab();
    }
    function sbSwitchBranch() {
      if (!sandboxHeads.feature) { sandboxLog = 'Create the "feature" branch first before switching.'; renderBranchLab(); return; }
      sandboxActiveBranch = sandboxActiveBranch === 'main' ? 'feature' : 'main';
      sandboxLog = '$ git checkout ' + sandboxActiveBranch + ' — Moved HEAD to ' + sandboxActiveBranch + '.';
      renderBranchLab();
    }
    function sbAddCommit() {
      const count = sandboxCommits.length + 1;
      if (count > 7) { sandboxLog = 'Graph reached sandbox display capacity (7 commits). Click Reset Graph to experiment again.'; renderBranchLab(); return; }
      const parentId = sandboxActiveBranch === 'main' ? sandboxHeads.main : sandboxHeads.feature;
      const newId = (sandboxActiveBranch === 'main' ? 'c' : 'f') + count;
      const newNode = { id: newId, label: newId + ' ' + (sandboxActiveBranch === 'main' ? 'Main' : 'Feat'), lane: sandboxActiveBranch === 'main' ? 0 : 1, col: sbNextCol(), parents: [parentId] };
      sandboxCommits.push(newNode);
      if (sandboxActiveBranch === 'main') sandboxHeads.main = newId; else sandboxHeads.feature = newId;
      sandboxLog = '$ git commit -m "' + newNode.label + '" — Recorded snapshot on ' + sandboxActiveBranch + '.';
      renderBranchLab();
    }
    function sbMerge() {
      if (!sandboxHeads.feature) { sandboxLog = 'No feature branch exists yet to merge.'; renderBranchLab(); return; }
      if (sandboxHeads.main === sandboxHeads.feature) { sandboxLog = 'Already up to date — main and feature point to the same commit.'; renderBranchLab(); return; }
      const isAncestor = (targetId, startId) => {
        const visited = new Set(), queue = [startId];
        while (queue.length) {
          const cur = queue.shift();
          if (cur === targetId) return true;
          if (visited.has(cur)) continue;
          visited.add(cur);
          const node = sandboxCommits.find(n => n.id === cur);
          if (node) queue.push(...node.parents);
        }
        return false;
      };
      sandboxActiveBranch = 'main';
      if (isAncestor(sandboxHeads.main, sandboxHeads.feature)) {
        sandboxHeads.main = sandboxHeads.feature;
        sandboxLog = '$ git merge feature — Fast-Forward! Slid main pointer forward linearly.';
      } else {
        const mId = 'm' + (sandboxCommits.length + 1);
        sandboxCommits.push({ id: mId, label: mId + ' Merge', lane: 0, col: sbNextCol(), parents: [sandboxHeads.main, sandboxHeads.feature], isMerge: true });
        sandboxHeads.main = mId;
        sandboxLog = '$ git merge feature — Created 3-Way Merge Commit (' + mId + ') joining main & feature.';
      }
      renderBranchLab();
    }
    function sbDeleteFeature() {
      if (!sandboxHeads.feature) { sandboxLog = 'No feature branch to delete.'; renderBranchLab(); return; }
      if (sandboxActiveBranch === 'feature') { sandboxLog = 'Switch to "main" before deleting "feature"!'; renderBranchLab(); return; }
      delete sandboxHeads.feature;
      sandboxLog = '$ git branch -d feature — Deleted feature pointer (commits remain safely in graph).';
      renderBranchLab();
    }
    function sbReset() {
      sandboxCommits = JSON.parse(JSON.stringify(INITIAL_SANDBOX));
      sandboxHeads = { main: 'c2' };
      sandboxActiveBranch = 'main';
      sandboxLog = 'Sandbox reset to initial 2-commit main history.';
      renderBranchLab();
    }

    function renderBranchLab() {
      const sc = MERGE_SCENARIOS[mergeMode];
      const modes = [
        ['fast-forward', 'Fast-Forward'],
        ['three-way', '3-Way Merge'],
        ['rebase', 'Rebase'],
        ['cherry-pick', 'Cherry-Pick']
      ];
      document.getElementById('view-branch').innerHTML =
        '<section class="card card-lg">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;padding-bottom:14px;border-bottom:1px solid #F1F5F9;">'
        +   '<div><h1 style="font-size:20px;font-weight:700;">Different Types of Merge &amp; Branch Integration</h1><p style="font-size:13.5px;color:#64748B;margin-top:3px;">Compare Fast-Forward, 3-Way Merge, Rebase, and Cherry-Pick side-by-side in an interactive SVG graph.</p></div>'
        +   '<div class="tabs">' + modes.map(([k, lbl]) => '<button class="tab-btn ' + (mergeMode === k ? 'active' : '') + '" onclick="mergeMode=\\'' + k + '\\';mergeApplied=false;renderBranchLab()">' + lbl + '</button>').join('') + '</div>'
        + '</div>'
        + '<div style="margin-top:16px;">' + buildCommitGraphSvg(mergeApplied ? sc.afterCommits : sc.beforeCommits, mergeApplied ? sc.afterHeads : sc.beforeHeads) + '</div>'
        + '<div style="margin-top:14px;padding-top:14px;border-top:1px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">'
        +   '<div style="max-width:740px;">'
        +     '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><strong style="font-size:14px;">' + esc(sc.title) + '</strong><span style="color:#CBD5E1;">·</span><code style="font-size:12px;color:#075985;">' + esc(sc.command) + '</code></div>'
        +     '<p style="font-size:12.5px;color:#475569;margin-top:4px;line-height:1.55;"><strong style="color:#1E293B;">When:</strong> ' + esc(sc.whenItHappens) + ' <strong style="color:#1E293B;">Result:</strong> ' + esc(sc.result) + '</p>'
        +   '</div>'
        +   '<button class="btn ' + (mergeApplied ? '' : 'btn-primary') + '" onclick="mergeApplied=!mergeApplied;renderBranchLab()">' + (mergeApplied ? 'Show Before State' : 'Simulate ' + esc(sc.title)) + '</button>'
        + '</div>'
        + '</section>'
        + '<section class="card card-lg">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding-bottom:14px;border-bottom:1px solid #F1F5F9;">'
        +   '<div><h2 style="font-size:16px;font-weight:700;">Live Branching Playground</h2><p style="font-size:12.5px;color:#64748B;margin-top:2px;">Build your own commit history: branch out, switch HEAD, commit on either lane, merge, and delete branches.</p></div>'
        +   '<button class="btn" onclick="sbReset()">↺ Reset Graph</button>'
        + '</div>'
        + '<div style="margin-top:14px;">' + buildCommitGraphSvg(sandboxCommits, sandboxHeads, sandboxActiveBranch) + '</div>'
        + '<div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:10px;">'
        +   '<button class="btn btn-sky" onclick="sbCreateBranch()">git checkout -b feature</button>'
        +   '<button class="btn btn-emerald" onclick="sbAddCommit()">git commit (on ' + sandboxActiveBranch + ')</button>'
        +   '<button class="btn" onclick="sbSwitchBranch()">Switch to ' + (sandboxActiveBranch === 'main' ? 'feature' : 'main') + '</button>'
        +   '<button class="btn btn-indigo" onclick="sbMerge()">git merge feature → main</button>'
        +   '<button class="btn btn-rose" onclick="sbDeleteFeature()">git branch -d feature</button>'
        + '</div>'
        + '<div class="terminal" style="margin-top:14px;max-height:none;color:#7DD3FC;">' + esc(sandboxLog) + '</div>'
        + '</section>';
    }

    /* ===== VIEW 3: FLOW MATRIX (1-TO-1 MATCH WITH LIVE APP) ===== */
    function renderFlowMatrix() {
      const sel = FLOW_ROWS.find(r => r.id === selectedFlowId) || FLOW_ROWS[0];
      const forwardRows = FLOW_ROWS.filter(r => r.direction === 'forward');
      const backwardRows = FLOW_ROWS.filter(r => r.direction === 'backward');
      const x1 = FM_BOX_CENTERS[sel.from], x2 = FM_BOX_CENTERS[sel.to], midX = (x1 + x2) / 2;
      const isForward = sel.direction === 'forward';
      const arcY = isForward ? 26 : 214;
      const anchorY = isForward ? 84 : 156;
      const activeColor = isForward ? '#0284C7' : '#DC2626';

      const boxes = [
        { id: 'workspace', title: 'Workspace', sub: 'Working Directory', x: 45, fill: '#FFFDF9', stroke: '#F59E0B', text: '#92400E' },
        { id: 'staging', title: 'Staging Area', sub: 'Git Index', x: 285, fill: '#F9FCFF', stroke: '#0284C7', text: '#075985' },
        { id: 'local', title: 'Local Repo', sub: '.git History', x: 525, fill: '#F8FDFB', stroke: '#059669', text: '#065F46' },
        { id: 'remote', title: 'Remote Repo', sub: 'GitHub Origin', x: 785, fill: '#FAFAFF', stroke: '#4F46E5', text: '#3730A3' }
      ];

      const boxesSvg = boxes.map(b => {
        const isEnd = sel.from === b.id || sel.to === b.id;
        return '<g>'
          + '<rect x="' + b.x + '" y="84" width="160" height="72" rx="12" fill="' + b.fill + '" stroke="' + (isEnd ? '#0F172A' : b.stroke) + '" stroke-width="' + (isEnd ? '2.5' : '1.5') + '"/>'
          + '<text x="' + (b.x + 80) + '" y="116" text-anchor="middle" font-size="14" font-weight="700" fill="#0F172A">' + b.title + '</text>'
          + '<text x="' + (b.x + 80) + '" y="136" text-anchor="middle" font-size="11" fill="' + b.text + '">' + b.sub + '</text>'
          + '</g>';
      }).join('');

      const safetyColor = sel.safety === 'Destructive' ? '#BE123C' : sel.safety === 'Caution' ? '#B45309' : '#047857';

      const renderRowList = (rows, isFwd) => rows.map(row => {
        const active = sel.id === row.id;
        return '<button type="button" class="fm-row-btn ' + (active ? (isFwd ? 'active-fwd' : 'active-bwd') : '') + '" onclick="selectedFlowId=\\'' + row.id + '\\';renderFlowMatrix()">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">'
          +   '<code style="font-size:12px;font-weight:700;color:' + (isFwd ? '#0C4A6E' : '#881337') + ';">' + esc(row.command) + '</code>'
          +   '<span style="font-size:11px;font-weight:500;color:#64748B;white-space:nowrap;">' + esc(row.fromLabel) + ' → ' + esc(row.toLabel) + '</span>'
          + '</div>'
          + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:4px;">'
          +   '<span style="font-size:12px;color:#475569;">' + esc(row.purpose) + '</span>'
          +   (row.safety === 'Destructive' ? '<span style="font-size:11px;font-weight:700;color:#BE123C;white-space:nowrap;">Destructive</span>' : '')
          + '</div>'
          + '</button>';
      }).join('');

      document.getElementById('view-matrix').innerHTML =
        '<section class="card card-lg">'
        + '<div style="padding-bottom:14px;border-bottom:1px solid #F1F5F9;">'
        +   '<h1 style="font-size:20px;font-weight:700;">4-Stage Forward &amp; Backward Flow Map</h1>'
        +   '<p style="font-size:13.5px;color:#64748B;margin-top:3px;">Click any command row below to illuminate its exact route between Workspace, Staging Area, Local Repo, and Remote Repo.</p>'
        + '</div>'
        + '<div style="margin-top:16px;overflow-x:auto;">'
        + '<svg viewBox="0 0 990 245" style="width:100%;min-width:700px;height:240px;display:block;">'
        +   '<defs>'
        +     '<marker id="fm-arrow-fwd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#0284C7"/></marker>'
        +     '<marker id="fm-arrow-bwd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#DC2626"/></marker>'
        +   '</defs>'
        +   boxesSvg
        +   '<line x1="205" y1="120" x2="285" y2="120" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="3 3"/>'
        +   '<line x1="445" y1="120" x2="525" y2="120" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="3 3"/>'
        +   '<line x1="685" y1="120" x2="785" y2="120" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="3 3"/>'
        +   '<path d="M ' + x1 + ' ' + anchorY + ' Q ' + midX + ' ' + arcY + ' ' + x2 + ' ' + anchorY + '" fill="none" stroke="' + activeColor + '" stroke-width="3" class="' + (isForward ? 'animate-flow-forward' : 'animate-flow-backward') + '" marker-end="' + (isForward ? 'url(#fm-arrow-fwd)' : 'url(#fm-arrow-bwd)') + '"/>'
        +   '<rect x="' + (midX - 135) + '" y="' + (isForward ? 8 : 204) + '" width="270" height="28" rx="6" fill="#FFFFFF" stroke="' + activeColor + '" stroke-width="1.5"/>'
        +   '<text x="' + midX + '" y="' + (isForward ? 26 : 222) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + activeColor + '" font-family="monospace">' + esc(sel.command) + '</text>'
        + '</svg></div>'
        + '<div style="margin-top:10px;padding-top:12px;border-top:1px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:12.5px;color:#475569;">'
        +   '<div><strong style="color:#0F172A;">Selected Route:</strong> ' + esc(sel.fromLabel) + ' → ' + esc(sel.toLabel) + ' · ' + esc(sel.purpose) + '</div>'
        +   '<span style="font-weight:700;color:' + safetyColor + ';">Safety: ' + esc(sel.safety) + '</span>'
        + '</div>'
        + '</section>'
        + '<div class="fm-two-col">'
        +   '<section class="card card-lg">'
        +     '<div style="display:flex;align-items:center;gap:8px;padding-bottom:12px;border-bottom:1px solid #F1F5F9;"><span style="color:#0284C7;font-weight:700;">→</span><h2 style="font-size:15.5px;font-weight:700;">1. Forward Commands (Advance Changes)</h2></div>'
        +     '<div style="margin-top:6px;">' + renderRowList(forwardRows, true) + '</div>'
        +   '</section>'
        +   '<section class="card card-lg">'
        +     '<div style="display:flex;align-items:center;gap:8px;padding-bottom:12px;border-bottom:1px solid #F1F5F9;"><span style="color:#DC2626;font-weight:700;">←</span><h2 style="font-size:15.5px;font-weight:700;">2. Backward Commands (Undo &amp; Rewind)</h2></div>'
        +     '<div style="margin-top:6px;">' + renderRowList(backwardRows, false) + '</div>'
        +   '</section>'
        + '</div>'
        + '<section class="safety-box">'
        +   '<span style="font-size:18px;line-height:1;">⚠️</span>'
        +   '<div><strong>Shared Remote Safety Rule:</strong> <code class="inline-pill-code">git reset</code> alone does NOT undo a commit already pushed to GitHub. Rewriting remote history requires <code class="inline-pill-code">git push --force-with-lease</code>. For any shared repository, always prefer <code class="inline-pill-code">git revert HEAD</code> so your team’s history never breaks.</div>'
        + '</section>';
    }

    /* ===== VIEW 4: CHEAT SHEET (1-TO-1 MATCH WITH LIVE APP) ===== */
    function copyCheat(cmd) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cmd).catch(() => {});
      } else {
        const ta = document.createElement('textarea');
        ta.value = cmd;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
      }
      copiedCmd = cmd;
      renderCheatSheet();
      setTimeout(() => { if (copiedCmd === cmd) { copiedCmd = null; renderCheatSheet(); } }, 1400);
    }

    function onCheatSearch(inputEl) {
      const pos = inputEl.selectionStart || 0;
      cheatQuery = inputEl.value;
      renderCheatSheet();
      const next = document.getElementById('cheat-search');
      if (next) {
        next.focus();
        next.setSelectionRange(pos, pos);
      }
    }

    function renderCheatSheet() {
      const cats = ['All','Setup','Daily Workflow','Inspect & Diff','Undo & Recovery','Branch & Merge','Remote & SSH','Stash & Clean'];
      const q = cheatQuery.trim().toLowerCase();
      const list = CHEAT_SHEET.filter(item =>
        (cheatCategory === 'All' || item.category === cheatCategory) &&
        (!q || item.command.toLowerCase().includes(q) || (item.shorthand && item.shorthand.toLowerCase().includes(q)) || item.description.toLowerCase().includes(q) || item.category.toLowerCase().includes(q))
      );

      const quickCards = [
        { label: 'Commit → Staging', cmd: 'git reset --soft HEAD~1' },
        { label: 'Commit → Workspace', cmd: 'git reset HEAD~1' },
        { label: 'Staging → Workspace', cmd: 'git restore --staged .' },
        { label: 'Workspace → Last Commit', cmd: 'git restore .' }
      ];

      document.getElementById('view-cheatsheet').innerHTML =
        '<section class="card card-lg">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;padding-bottom:16px;border-bottom:1px solid #F1F5F9;">'
        +   '<div><h1 style="font-size:20px;font-weight:700;">Practical Git Infographic Cheat Sheet</h1><p style="font-size:13.5px;color:#64748B;margin-top:3px;">Most-used commands, practical shorthands, SSH setup, and recovery recipes — click Copy on any row.</p></div>'
        +   '<div class="search-wrap"><span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#94A3B8;font-size:13px;pointer-events:none;">🔍</span>'
        +     '<input id="cheat-search" class="search-input" type="text" placeholder="Filter commands (e.g. reset, stash, ssh)..." value="' + esc(cheatQuery) + '" oninput="onCheatSearch(this)" />'
        +   '</div>'
        + '</div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:14px;">'
        +   cats.map(c => '<button class="cat-btn ' + (cheatCategory === c ? 'active' : '') + '" onclick="cheatCategory=\\'' + c + '\\';renderCheatSheet()">' + c + '</button>').join('')
        + '</div>'
        + '<div class="quick-strip">'
        +   quickCards.map(qc => '<div class="quick-card"><span style="font-size:11px;font-weight:600;color:#64748B;">' + qc.label + '</span><code style="font-size:12px;font-weight:700;color:#0F172A;">' + qc.cmd + '</code></div>').join('')
        + '</div>'
        + '</section>'
        + '<section class="card card-lg">'
        + '<div style="display:flex;justify-content:space-between;padding-bottom:10px;border-bottom:1px solid #F1F5F9;font-size:12px;color:#64748B;"><span>Showing ' + list.length + ' practical commands</span><span>Click Copy on any row</span></div>'
        + (list.length === 0
            ? '<div style="padding:40px 12px;text-align:center;color:#64748B;font-size:13.5px;">No Git commands match "' + esc(cheatQuery) + '". Try clearing the filter.</div>'
            : '<div style="overflow-x:auto;"><table><thead><tr><th>Category</th><th>Command</th><th>Practical Shorthand</th><th>Purpose</th><th style="text-align:right;">Copy</th></tr></thead><tbody>'
              + list.map((i, idx) => {
                  const isCopied = copiedCmd === i.command;
                  return '<tr>'
                    + '<td style="font-size:12px;color:#64748B;white-space:nowrap;">' + esc(i.category) + '</td>'
                    + '<td style="white-space:nowrap;"><code style="font-size:12px;font-weight:700;color:#0F172A;">' + esc(i.command) + '</code></td>'
                    + '<td style="white-space:nowrap;"><code style="font-size:12px;color:#075985;">' + esc(i.shorthand || '—') + '</code></td>'
                    + '<td style="font-size:12.5px;color:#334155;">' + esc(i.description) + '</td>'
                    + '<td style="text-align:right;white-space:nowrap;"><button class="btn" style="padding:4px 10px;font-size:11px;' + (isCopied ? 'color:#047857;border-color:#A7F3D0;background:#ECFDF5;' : '') + '" onclick="copyCheat(CHEAT_SHEET[' + CHEAT_SHEET.indexOf(i) + '].command)">' + (isCopied ? '✓ Copied' : 'Copy') + '</button></td>'
                    + '</tr>';
                }).join('')
              + '</tbody></table></div>')
        + '</section>';
    }

    document.addEventListener('keydown', (e) => {
      if (currentView !== 'tutorial' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'ArrowRight') goStep(currentStep + 1);
      if (e.key === 'ArrowLeft') goStep(currentStep - 1);
    });

    initStepSelector();
    renderTutorial();
  </script>
</body>
</html>`;
}

export function downloadOfflineHtml(): void {
  const html = buildStandaloneOfflineHtml();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gitframe-offline-tutorial.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
