import { LessonStep, RepoState, CommandEffect } from '../types/git';

export function cloneState(state: RepoState): RepoState {
  return JSON.parse(JSON.stringify(state));
}

export function runCommandEffect(prev: RepoState, effect: CommandEffect, rawCommand: string): RepoState {
  const s = cloneState(prev);
  s.activeFlow = null;
  s.highlightStage = null;

  switch (effect.type) {
    case 'intro_git': {
      s.initialized = true;
      s.highlightStage = 'local';
      s.activeFlow = {
        from: 'workspace',
        to: 'local',
        direction: 'forward',
        command: rawCommand,
        label: 'Git = Local Engine (100% Offline)',
      };
      s.terminalLines = [
        '$ # GIT — Distributed Version Control System (Local Engine)',
        'Created by: Linus Torvalds (2005) to manage the Linux kernel after BitKeeper ended free access.',
        'Ownership: Free & Open-Source (GNU GPL v2) — owned by no company; community maintained.',
        'Scope: Powers Stages 1–3 (Workspace, Staging Area, Local Repo) right on your machine.',
      ];
      return s;
    }

    case 'intro_github': {
      s.remoteConnected = true;
      s.highlightStage = 'remote';
      s.activeFlow = {
        from: 'local',
        to: 'remote',
        direction: 'inspect',
        command: rawCommand,
        label: 'GitHub = Cloud Vault (Owned by Microsoft)',
      };
      s.terminalLines = [
        '$ # GITHUB — Cloud Hosting & Collaboration Platform',
        'Founded: 2008 (Tom Preston-Werner, Chris Wanstrath, PJ Hyett, Scott Chacon).',
        'Ownership: Acquired & owned by Microsoft since 2018 ($7.5B).',
        'Scope: Hosts Stage 4 (Remote Repo) + Pull Requests, Issues, Actions & Code Review.',
      ];
      return s;
    }

    case 'intro_sync': {
      s.initialized = true;
      s.remoteConnected = true;
      s.highlightStage = 'remote';
      s.activeFlow = {
        from: 'local',
        to: 'remote',
        direction: 'forward',
        command: rawCommand,
        label: 'Git (Local) pushes snapshots → GitHub (Cloud)',
      };
      s.terminalLines = [
        '$ # HOW THEY WORK TOGETHER',
        '1. Git records snapshots locally in .git/ (even with zero internet).',
        '2. GitHub stores your remote backup so teammates can pull, review & collaborate.',
        'Note: Git also works with GitLab, Bitbucket, or your own private server!',
      ];
      return s;
    }

    case 'version': {
      s.terminalLines = [
        `$ ${rawCommand}`,
        'git version 2.47.1 — Local Git engine installed and ready.',
      ];
      s.highlightStage = 'workspace';
      return s;
    }

    case 'init': {
      s.initialized = true;
      s.highlightStage = 'local';
      s.activeFlow = {
        from: 'workspace',
        to: 'local',
        direction: 'forward',
        command: rawCommand,
        label: 'Creates hidden .git/ recorder',
      };
      s.terminalLines = [
        `$ ${rawCommand}`,
        'Initialized empty Git repository in ~/my-room-project/.git/',
        'Created: .git/HEAD, .git/config, .git/objects/, .git/refs/heads/',
      ];
      return s;
    }

    case 'uninit': {
      s.initialized = false;
      s.staging = [];
      s.localCommits = [];
      s.highlightStage = 'workspace';
      s.activeFlow = {
        from: 'local',
        to: 'workspace',
        direction: 'backward',
        command: rawCommand,
        label: 'Removes .git/ camera (files remain)',
      };
      s.terminalLines = [
        `$ ${rawCommand}`,
        'Removed .git/ folder. Project files remain untouched, but Git tracking is off.',
      ];
      return s;
    }

    case 'config_set': {
      if (effect.arg) s.config.name = effect.arg;
      if (effect.arg2) s.config.email = effect.arg2;
      s.config.autocrlf = 'true';
      s.highlightStage = 'local';
      s.activeFlow = {
        from: 'workspace',
        to: 'local',
        direction: 'local',
        command: rawCommand,
        label: 'Writes operator identity',
      };
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Saved in Git config: user.name="${s.config.name || '(not set)'}" | user.email="${s.config.email || '(not set)'}"`,
      ];
      return s;
    }

    case 'config_list': {
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `user.name=${s.config.name || '(not set)'}`,
        `user.email=${s.config.email || '(not set)'}`,
        `core.autocrlf=${s.config.autocrlf}`,
      ];
      return s;
    }

    case 'status': {
      const untracked = s.workspace.filter((f) => f.status === 'untracked').map((f) => f.name);
      const modified = s.workspace.filter((f) => f.status === 'modified').map((f) => f.name);
      const staged = s.staging.map((f) => f.name);
      s.highlightStage = 'workspace';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `On branch ${s.currentBranch}`,
        staged.length ? `Changes to be committed: ${staged.join(', ')}` : 'No files staged yet.',
        untracked.length || modified.length
          ? `Workspace changes: ${[...modified.map((n) => `${n} (modified)`), ...untracked.map((n) => `${n} (untracked)`)].join(', ')}`
          : 'Working tree clean.',
      ];
      return s;
    }

    case 'status_short': {
      const lines: string[] = [`$ ${rawCommand}`];
      s.staging.forEach((f) => lines.push(`A  ${f.name}`));
      s.workspace.forEach((f) => {
        if (f.status === 'untracked') lines.push(`?? ${f.name}`);
        if (f.status === 'modified') lines.push(` M ${f.name}`);
        if (f.status === 'deleted') lines.push(` D ${f.name}`);
      });
      if (lines.length === 1) lines.push('(clean working tree)');
      s.highlightStage = 'workspace';
      s.terminalLines = lines;
      return s;
    }

    case 'add_file': {
      const target = effect.arg || 'index.html';
      const idx = s.workspace.findIndex((f) => f.name === target && f.status !== 'ignored');
      if (idx !== -1) {
        const file = s.workspace[idx];
        if (!s.staging.some((st) => st.name === file.name)) {
          s.staging.push({ name: file.name, status: 'staged', detail: 'Ready to commit' });
        }
        s.workspace[idx] = { ...file, status: 'clean', detail: 'Copied to Staging Area' };
        s.activeFlow = {
          from: 'workspace',
          to: 'staging',
          direction: 'forward',
          command: rawCommand,
          label: `Staged ${target}`,
        };
        s.highlightStage = 'staging';
        s.terminalLines = [
          `$ ${rawCommand}`,
          `Placed "${target}" into the Staging Area (index).`,
        ];
      } else {
        s.terminalLines = [`$ ${rawCommand}`, `"${target}" is already staged or ignored.`];
      }
      return s;
    }

    case 'add_all': {
      const movable = s.workspace.filter(
        (f) => f.status === 'untracked' || f.status === 'modified' || f.status === 'deleted'
      );
      if (movable.length === 0) {
        s.terminalLines = [`$ ${rawCommand}`, 'Nothing new to stage. All eligible files are already staged.'];
        return s;
      }
      movable.forEach((f) => {
        if (!s.staging.some((st) => st.name === f.name)) {
          s.staging.push({
            name: f.name,
            status: f.status === 'deleted' ? 'deleted' : 'staged',
            detail: f.status === 'deleted' ? 'Removal staged' : 'Staged for commit',
          });
        }
      });
      s.workspace = s.workspace.map((f) =>
        f.status === 'untracked' || f.status === 'modified'
          ? { ...f, status: 'clean', detail: 'Staged in index' }
          : f
      );
      s.activeFlow = {
        from: 'workspace',
        to: 'staging',
        direction: 'forward',
        command: rawCommand,
        label: `Staged ${movable.length} file(s)`,
      };
      s.highlightStage = 'staging';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Staged ${movable.length} file(s) into the Staging Area: ${movable.map((f) => f.name).join(', ')}`,
      ];
      return s;
    }

    case 'add_star': {
      const movable = s.workspace.filter((f) => f.status === 'untracked' || f.status === 'modified');
      movable.forEach((f) => {
        if (!s.staging.some((st) => st.name === f.name)) {
          s.staging.push({ name: f.name, status: 'staged', detail: 'Staged (deletions skipped)' });
        }
      });
      s.workspace = s.workspace.map((f) =>
        f.status === 'untracked' || f.status === 'modified'
          ? { ...f, status: 'clean', detail: 'Staged via wildcard' }
          : f
      );
      s.activeFlow = {
        from: 'workspace',
        to: 'staging',
        direction: 'forward',
        command: rawCommand,
        label: 'Staged new & modified (no deletions)',
      };
      s.highlightStage = 'staging';
      s.terminalLines = [
        `$ ${rawCommand}`,
        'Staged all new and modified files in current directory (deleted files excluded).',
      ];
      return s;
    }

    case 'ls_files': {
      const names = s.staging.map((f) => f.name);
      s.highlightStage = 'staging';
      s.terminalLines = [
        `$ ${rawCommand}`,
        names.length ? names.join('\n') : '(Staging index currently has no newly queued entries)',
      ];
      return s;
    }

    case 'commit': {
      if (s.staging.length === 0) {
        s.terminalLines = [
          `$ ${rawCommand}`,
          'Nothing to commit. Stage changes with "git add ." first.',
        ];
        return s;
      }
      const msg = effect.arg || 'Add project files';
      const newHash = (Math.random().toString(16).slice(2, 9)).padEnd(7, 'a');
      const files = s.staging.map((f) => f.name);
      s.localCommits.unshift({
        id: newHash,
        message: msg,
        branch: s.currentBranch,
        files,
        author: s.config.name || 'Mamun',
      });
      s.staging = [];
      s.activeFlow = {
        from: 'staging',
        to: 'local',
        direction: 'forward',
        command: rawCommand,
        label: `Snapshot ${newHash} saved`,
      };
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `[${s.currentBranch} ${newHash}] ${msg}`,
        ` ${files.length} file(s) committed to Local Repository.`,
      ];
      return s;
    }

    case 'commit_am': {
      const trackedMods = s.workspace.filter((f) => f.status === 'modified');
      const stagedNames = s.staging.map((f) => f.name);
      const committedFiles = Array.from(new Set([...stagedNames, ...trackedMods.map((f) => f.name)]));
      if (committedFiles.length === 0) {
        s.terminalLines = [
          `$ ${rawCommand}`,
          'No modified tracked files found. (Note: -am skips untracked new files!)',
        ];
        return s;
      }
      const msg = effect.arg || 'Update tracked files';
      const newHash = 'c9f41e2';
      s.localCommits.unshift({
        id: newHash,
        message: msg,
        branch: s.currentBranch,
        files: committedFiles,
        author: s.config.name || 'Mamun',
      });
      s.staging = [];
      s.workspace = s.workspace.map((f) =>
        f.status === 'modified' ? { ...f, status: 'clean', detail: 'Committed via -am' } : f
      );
      s.activeFlow = {
        from: 'workspace',
        to: 'local',
        direction: 'forward',
        command: rawCommand,
        label: 'Auto-staged & committed',
      };
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `[${s.currentBranch} ${newHash}] ${msg}`,
        `Auto-staged modified tracked files (${committedFiles.join(', ')}) and saved snapshot.`,
      ];
      return s;
    }

    case 'commit_amend': {
      if (s.localCommits.length === 0) {
        s.terminalLines = [`$ ${rawCommand}`, 'No previous commit to amend yet — make a commit first.'];
        return s;
      }
      const updatedMsg = effect.arg || 'Polish homepage';
      const prevCommit = s.localCommits[0];
      const stagedCount = s.staging.length;
      const mergedFiles = Array.from(new Set([...prevCommit.files, ...s.staging.map((f) => f.name)]));
      const amendedHash = prevCommit.id === 'b7e309d' ? 'f2a841c' : 'b7e309d';
      s.localCommits[0] = {
        ...prevCommit,
        id: amendedHash,
        message: updatedMsg,
        files: mergedFiles,
      };
      s.staging = [];
      s.activeFlow = stagedCount > 0
        ? {
            from: 'staging',
            to: 'local',
            direction: 'forward',
            command: rawCommand,
            label: `Folded ${stagedCount} file(s) into HEAD`,
          }
        : {
            from: 'local',
            to: 'local',
            direction: 'local',
            command: rawCommand,
            label: `Rewrote HEAD ${prevCommit.id} → ${amendedHash}`,
          };
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `[${s.currentBranch} ${amendedHash}] ${updatedMsg}`,
        stagedCount > 0
          ? `Replaced ${prevCommit.id} in-place and folded ${stagedCount} staged file(s) into it.`
          : `Replaced ${prevCommit.id} in-place (message updated; no extra commit added).`,
      ];
      return s;
    }

    case 'diff_workspace': {
      s.highlightStage = 'workspace';
      s.activeFlow = {
        from: 'workspace',
        to: 'staging',
        direction: 'inspect',
        command: rawCommand,
        label: 'Compares Workspace vs Staging',
      };
      s.terminalLines = [
        `$ ${rawCommand}`,
        '--- a/app.js  (Staging Area)',
        '+++ b/app.js  (Workspace)',
        '- const title = "Draft";',
        '+ const title = "GitFrame Live";',
      ];
      return s;
    }

    case 'diff_staged': {
      s.highlightStage = 'staging';
      s.activeFlow = {
        from: 'staging',
        to: 'local',
        direction: 'inspect',
        command: rawCommand,
        label: 'Compares Staging vs Last Commit',
      };
      s.terminalLines = [
        `$ ${rawCommand}`,
        '--- a/styles.css  (HEAD Commit)',
        '+++ b/styles.css  (Staging Area)',
        '+ .hero { background: #F8FAFC; }',
      ];
      return s;
    }

    case 'show_commit': {
      const target = s.localCommits[0];
      s.highlightStage = 'local';
      s.terminalLines = target
        ? [
            `$ ${rawCommand}`,
            `commit ${target.id} (HEAD -> ${target.branch})`,
            `Author: ${target.author}  |  Message: "${target.message}"`,
            `Files in snapshot: ${target.files.join(', ')}`,
          ]
        : [`$ ${rawCommand}`, 'No commits recorded yet.'];
      return s;
    }

    case 'log_full': {
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        ...s.localCommits.slice(0, 3).map(
          (c, i) => `commit ${c.id}${i === 0 ? ` (HEAD -> ${s.currentBranch})` : ''} — ${c.author}: ${c.message}`
        ),
      ];
      return s;
    }

    case 'log_oneline': {
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        ...s.localCommits.map((c, i) => `${c.id}${i === 0 ? ` (HEAD -> ${s.currentBranch})` : ''} ${c.message}`),
      ];
      return s;
    }

    case 'log_stat': {
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        ...s.localCommits.slice(0, 2).map(
          (c) => `${c.id} ${c.message} | ${c.files.length} file(s) changed (${c.files.join(', ')})`
        ),
      ];
      return s;
    }

    case 'checkout_past': {
      if (s.localCommits.length > 1) {
        const past = s.localCommits[s.localCommits.length - 1];
        s.headDetachedAt = past.id;
        s.activeFlow = {
          from: 'local',
          to: 'workspace',
          direction: 'backward',
          command: rawCommand,
          label: `Time-traveled to ${past.id}`,
        };
        s.highlightStage = 'local';
        s.terminalLines = [
          `$ ${rawCommand}`,
          `HEAD is now at ${past.id} (${past.message}) — Detached HEAD mode.`,
        ];
      }
      return s;
    }

    case 'checkout_main': {
      s.headDetachedAt = null;
      s.currentBranch = 'main';
      s.highlightStage = 'local';
      s.activeFlow = {
        from: 'local',
        to: 'workspace',
        direction: 'forward',
        command: rawCommand,
        label: 'Returned to latest main',
      };
      s.terminalLines = [
        `$ ${rawCommand}`,
        'Switched back to branch "main". HEAD reattached to latest snapshot.',
      ];
      return s;
    }

    case 'restore_staged': {
      if (s.staging.length === 0) {
        s.terminalLines = [`$ ${rawCommand}`, 'Staging Area is already empty.'];
        return s;
      }
      const unstagedNames = s.staging.map((f) => f.name);
      s.workspace = s.workspace.map((w) =>
        unstagedNames.includes(w.name)
          ? { ...w, status: 'modified', detail: 'Unstaged back to Workspace' }
          : w
      );
      s.staging = [];
      s.activeFlow = {
        from: 'staging',
        to: 'workspace',
        direction: 'backward',
        command: rawCommand,
        label: 'Unstaged -> Workspace',
      };
      s.highlightStage = 'workspace';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Removed ${unstagedNames.join(', ')} from Staging Area. Your edits remain safe in Workspace.`,
      ];
      return s;
    }

    case 'restore_workspace': {
      const hadMods = s.workspace.some((f) => f.status === 'modified' || f.status === 'deleted');
      if (!hadMods) {
        s.terminalLines = [`$ ${rawCommand}`, 'No tracked workspace modifications to discard.'];
        return s;
      }
      s.workspace = s.workspace.map((f) =>
        f.status === 'modified' || f.status === 'deleted'
          ? { ...f, status: 'clean', detail: 'Restored to HEAD snapshot' }
          : f
      );
      s.activeFlow = {
        from: 'local',
        to: 'workspace',
        direction: 'backward',
        command: rawCommand,
        label: 'Discarded local edits',
      };
      s.highlightStage = 'workspace';
      s.terminalLines = [
        `$ ${rawCommand}`,
        'Restored modified tracked files in Workspace back to the last committed snapshot.',
      ];
      return s;
    }

    case 'clean_preview': {
      const untracked = s.workspace.filter((f) => f.status === 'untracked');
      s.highlightStage = 'workspace';
      s.terminalLines = [
        `$ ${rawCommand}`,
        untracked.length
          ? `Dry run — would delete untracked files: ${untracked.map((f) => f.name).join(', ')}`
          : 'Dry run — no untracked files to clean.',
      ];
      return s;
    }

    case 'clean_force': {
      const removed = s.workspace.filter((f) => f.status === 'untracked');
      s.workspace = s.workspace.filter((f) => f.status !== 'untracked');
      s.highlightStage = 'workspace';
      s.terminalLines = [
        `$ ${rawCommand}`,
        removed.length
          ? `Deleted untracked clutter: ${removed.map((f) => f.name).join(', ')}`
          : 'Workspace already free of untracked files.',
      ];
      return s;
    }

    case 'reset_soft': {
      if (s.localCommits.length <= 1) {
        s.terminalLines = [`$ ${rawCommand}`, 'Already at initial commit.'];
        return s;
      }
      const popped = s.localCommits.shift()!;
      popped.files.forEach((fname) => {
        if (!s.staging.some((f) => f.name === fname)) {
          s.staging.push({ name: fname, status: 'staged', detail: `Kept staged from ${popped.id}` });
        }
      });
      s.activeFlow = {
        from: 'local',
        to: 'staging',
        direction: 'backward',
        command: rawCommand,
        label: 'Local -> Staging (--soft)',
      };
      s.highlightStage = 'staging';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Undid commit ${popped.id} ("${popped.message}").`,
        'Files moved back to Staging Area — ready to edit message or re-commit.',
      ];
      return s;
    }

    case 'reset_mixed': {
      if (s.localCommits.length <= 1) {
        s.terminalLines = [`$ ${rawCommand}`, 'Already at initial commit.'];
        return s;
      }
      const popped = s.localCommits.shift()!;
      s.staging = [];
      popped.files.forEach((fname) => {
        const existing = s.workspace.find((w) => w.name === fname);
        if (existing) {
          existing.status = 'modified';
          existing.detail = `Unstaged from ${popped.id}`;
        } else {
          s.workspace.push({ name: fname, status: 'modified', detail: `Unstaged from ${popped.id}` });
        }
      });
      s.activeFlow = {
        from: 'local',
        to: 'workspace',
        direction: 'backward',
        command: rawCommand,
        label: 'Local -> Workspace (default)',
      };
      s.highlightStage = 'workspace';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Undid commit ${popped.id}. Changes preserved as unstaged edits in Workspace.`,
      ];
      return s;
    }

    case 'reset_hard': {
      if (s.localCommits.length <= 1) {
        s.terminalLines = [`$ ${rawCommand}`, 'Already at initial commit.'];
        return s;
      }
      const popped = s.localCommits.shift()!;
      s.staging = [];
      s.workspace = s.workspace
        .filter((f) => !popped.files.includes(f.name) || f.name === 'index.html')
        .map((f) => ({ ...f, status: 'clean', detail: `Hard-reset to ${s.localCommits[0].id}` }));
      s.activeFlow = {
        from: 'local',
        to: 'workspace',
        direction: 'backward',
        command: rawCommand,
        label: 'Destructive rewind (--hard)',
      };
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `HEAD is now at ${s.localCommits[0].id} (${s.localCommits[0].message}).`,
        `Warning: Commit ${popped.id} and uncommitted changes were erased.`,
      ];
      return s;
    }

    case 'rm_file': {
      const target = effect.arg || 'old-notes.txt';
      s.workspace = s.workspace.filter((f) => f.name !== target);
      if (!s.staging.some((f) => f.name === target)) {
        s.staging.push({ name: target, status: 'deleted', detail: 'Deleted from disk & index' });
      }
      s.activeFlow = {
        from: 'workspace',
        to: 'staging',
        direction: 'forward',
        command: rawCommand,
        label: `Removed ${target}`,
      };
      s.highlightStage = 'staging';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `rm '${target}' — Deleted from Workspace and staged the removal.`,
      ];
      return s;
    }

    case 'rm_cached': {
      const target = effect.arg || 'secrets.env';
      s.staging = s.staging.filter((f) => f.name !== target);
      s.workspace = s.workspace.map((f) =>
        f.name === target ? { ...f, status: 'untracked', detail: 'Kept on disk, untracked' } : f
      );
      s.activeFlow = {
        from: 'staging',
        to: 'workspace',
        direction: 'backward',
        command: rawCommand,
        label: `Untracked ${target} (--cached)`,
      };
      s.highlightStage = 'workspace';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `rm '${target}' from Git index only. File remains safely on your hard drive!`,
      ];
      return s;
    }

    case 'mv_file': {
      const fromName = effect.arg || 'file1.js';
      const toName = effect.arg2 || 'main.js';
      s.workspace = s.workspace.map((f) =>
        f.name === fromName ? { name: toName, status: 'renamed', detail: `Renamed from ${fromName}` } : f
      );
      s.staging.push({ name: `${fromName} → ${toName}`, status: 'renamed', detail: 'Rename staged' });
      s.activeFlow = {
        from: 'workspace',
        to: 'staging',
        direction: 'forward',
        command: rawCommand,
        label: `Renamed -> ${toName}`,
      };
      s.highlightStage = 'staging';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Renamed "${fromName}" to "${toName}" and staged the move in one step.`,
      ];
      return s;
    }

    case 'create_gitignore': {
      if (!s.workspace.some((f) => f.name === '.gitignore')) {
        s.workspace.push({ name: '.gitignore', status: 'untracked', detail: 'Ignores *.psd, *.log, .env' });
      }
      s.workspace = s.workspace.map((f) =>
        f.name.endsWith('.psd') || f.name.endsWith('.env') || f.name.endsWith('.log')
          ? { ...f, status: 'ignored', detail: 'Hidden from camera (.gitignore)' }
          : f
      );
      s.highlightStage = 'workspace';
      s.terminalLines = [
        `$ ${rawCommand}`,
        'Created .gitignore with rules: *.psd, *.log, secrets.env',
        'Git camera now skips matching files automatically.',
      ];
      return s;
    }

    case 'stash_push': {
      const dirty = s.workspace.filter((f) => f.status === 'modified');
      if (dirty.length === 0) {
        s.terminalLines = [`$ ${rawCommand}`, 'No local modifications to save to Stash.'];
        return s;
      }
      s.stash.unshift(`WIP on ${s.currentBranch}: ${dirty.map((f) => f.name).join(', ')}`);
      s.workspace = s.workspace.map((f) =>
        f.status === 'modified' ? { ...f, status: 'clean', detail: 'Saved in Stash drawer' } : f
      );
      s.activeFlow = {
        from: 'workspace',
        to: 'local',
        direction: 'local',
        command: rawCommand,
        label: 'Shelved into Stash drawer',
      };
      s.highlightStage = 'workspace';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Saved working directory state to stash@{0}. Workspace is now clean!`,
      ];
      return s;
    }

    case 'stash_list': {
      s.highlightStage = 'workspace';
      s.terminalLines = [
        `$ ${rawCommand}`,
        ...(s.stash.length ? s.stash.map((item, idx) => `stash@{${idx}}: ${item}`) : ['(Stash drawer is empty)']),
      ];
      return s;
    }

    case 'stash_pop': {
      if (s.stash.length === 0) {
        s.terminalLines = [`$ ${rawCommand}`, 'No stash entries found to pop.'];
        return s;
      }
      const item = s.stash.shift()!;
      s.workspace = s.workspace.map((f) =>
        f.name === 'checkout.js' || f.name === 'app.js'
          ? { ...f, status: 'modified', detail: 'Restored from Stash' }
          : f
      );
      s.activeFlow = {
        from: 'local',
        to: 'workspace',
        direction: 'backward',
        command: rawCommand,
        label: 'Restored from Stash',
      };
      s.highlightStage = 'workspace';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Re-applied and dropped stash@{0} (${item}). Back to work!`,
      ];
      return s;
    }

    case 'branch_create': {
      const name = effect.arg || 'feature/login';
      if (!s.branches.includes(name)) {
        s.branches.push(name);
      }
      s.currentBranch = name;
      s.highlightStage = 'local';
      s.activeFlow = {
        from: 'local',
        to: 'workspace',
        direction: 'local',
        command: rawCommand,
        label: `Switched to ${name}`,
      };
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Switched to a new branch '${name}'. Your main timeline stays untouched.`,
      ];
      return s;
    }

    case 'branch_commit': {
      const newHash = 'f4e81c9';
      s.localCommits.unshift({
        id: newHash,
        message: effect.arg || 'Build login form component',
        branch: s.currentBranch,
        files: ['login.tsx'],
        author: s.config.name || 'Mamun',
      });
      if (!s.workspace.some((f) => f.name === 'login.tsx')) {
        s.workspace.push({ name: 'login.tsx', status: 'clean', detail: `On ${s.currentBranch}` });
      }
      s.activeFlow = {
        from: 'staging',
        to: 'local',
        direction: 'forward',
        command: rawCommand,
        label: `Committed on ${s.currentBranch}`,
      };
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `[${s.currentBranch} ${newHash}] ${effect.arg || 'Build login form component'}`,
      ];
      return s;
    }

    case 'branch_switch': {
      const target = effect.arg || 'main';
      if (!s.branches.includes(target)) {
        s.terminalLines = [`$ ${rawCommand}`, `Branch '${target}' does not exist yet.`];
        return s;
      }
      s.currentBranch = target;
      s.highlightStage = 'local';
      s.activeFlow = {
        from: 'local',
        to: 'workspace',
        direction: 'local',
        command: rawCommand,
        label: `HEAD -> ${target}`,
      };
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Switched to branch '${target}'. Workspace files updated to match '${target}'.`,
      ];
      return s;
    }

    case 'branch_delete': {
      const target = effect.arg || 'feature/login';
      if (s.currentBranch === target) {
        s.terminalLines = [
          `$ ${rawCommand}`,
          `Cannot delete '${target}' while standing on it. Switch to 'main' first!`,
        ];
        return s;
      }
      s.branches = s.branches.filter((b) => b !== target);
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Deleted branch ${target} (commit snapshots remain safely merged in main).`,
      ];
      return s;
    }

    case 'merge_ff': {
      s.currentBranch = 'main';
      if (!s.localCommits.some((c) => c.id === 'f4e81c9')) {
        s.localCommits.unshift({
          id: 'f4e81c9',
          message: 'Add dark theme toggle (Fast-Forward)',
          branch: 'main',
          files: ['theme.css'],
          author: s.config.name || 'Mamun',
        });
      }
      s.highlightStage = 'local';
      s.activeFlow = {
        from: 'local',
        to: 'workspace',
        direction: 'forward',
        command: rawCommand,
        label: 'Fast-Forward Merge',
      };
      s.terminalLines = [
        `$ ${rawCommand}`,
        'Updating 2b4d9a1..f4e81c9 — Fast-forward!',
        'No extra merge commit needed because main had no divergent commits.',
      ];
      return s;
    }

    case 'merge_3way': {
      s.currentBranch = 'main';
      if (!s.localCommits.some((c) => c.isMerge)) {
        s.localCommits.unshift({
          id: 'm9a2c41',
          message: "Merge branch 'feature/login' into main",
          branch: 'main',
          files: ['login.tsx', 'index.html'],
          author: s.config.name || 'Mamun',
          isMerge: true,
        });
      }
      s.highlightStage = 'local';
      s.activeFlow = {
        from: 'local',
        to: 'workspace',
        direction: 'forward',
        command: rawCommand,
        label: '3-Way Merge Commit',
      };
      s.terminalLines = [
        `$ ${rawCommand}`,
        "Merge made by the 'ort' strategy -> commit m9a2c41.",
        'Both main and feature/login histories are now joined with a merge commit.',
      ];
      return s;
    }

    case 'cherry_pick': {
      const targetId = effect.arg || 'e7a11b2';
      if (!s.localCommits.some((c) => c.id === 'p3c90d4')) {
        s.localCommits.unshift({
          id: 'p3c90d4',
          message: `Cherry-pick hotfix (${targetId}): Fix navbar crash`,
          branch: s.currentBranch,
          files: ['navbar.tsx'],
          author: s.config.name || 'Mamun',
        });
      }
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `[${s.currentBranch} p3c90d4] Applied single commit ${targetId} cleanly onto ${s.currentBranch}.`,
      ];
      return s;
    }

    case 'remote_add': {
      s.remoteConnected = true;
      s.remoteUrl = 'git@github.com:mamun/room-project.git';
      s.highlightStage = 'remote';
      s.activeFlow = {
        from: 'local',
        to: 'remote',
        direction: 'inspect',
        command: rawCommand,
        label: 'Linked alias "origin"',
      };
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Remote "origin" linked -> ${s.remoteUrl}`,
      ];
      return s;
    }

    case 'ssh_keygen': {
      s.sshReady = true;
      s.highlightStage = 'remote';
      s.terminalLines = [
        `$ ${rawCommand}`,
        'Generated Ed25519 keypair at ~/.ssh/id_ed25519 & id_ed25519.pub',
        'Copied public key to GitHub SSH Settings — passwordless auth ready!',
      ];
      return s;
    }

    case 'push_origin': {
      if (!s.remoteConnected) {
        s.remoteConnected = true;
      }
      s.remoteCommits = cloneState(s).localCommits;
      s.activeFlow = {
        from: 'local',
        to: 'remote',
        direction: 'forward',
        command: rawCommand,
        label: 'Uploaded Local -> GitHub',
      };
      s.highlightStage = 'remote';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Enumerating objects: ${s.localCommits.length * 3}, done.`,
        `Branch '${s.currentBranch}' set up to track 'origin/${s.currentBranch}'.`,
      ];
      return s;
    }

    case 'clone_repo': {
      s.initialized = true;
      s.remoteConnected = true;
      s.localCommits = cloneState(s).remoteCommits;
      s.workspace = [
        { name: 'index.html', status: 'clean', detail: 'Cloned from GitHub' },
        { name: 'app.js', status: 'clean', detail: 'Cloned from GitHub' },
        { name: 'README.md', status: 'clean', detail: 'Cloned from GitHub' },
      ];
      s.activeFlow = {
        from: 'remote',
        to: 'workspace',
        direction: 'backward',
        command: rawCommand,
        label: 'Cloned full repo + .git',
      };
      s.highlightStage = 'workspace';
      s.terminalLines = [
        `$ ${rawCommand}`,
        "Cloning into 'room-project'... Receiving objects: 100%, done.",
      ];
      return s;
    }

    case 'fetch_origin': {
      const incoming = s.remoteCommits.find(
        (rc) => !s.localCommits.some((lc) => lc.id === rc.id)
      );
      if (incoming) {
        s.localCommits.unshift({ ...incoming, branch: 'origin/main' });
      }
      s.activeFlow = {
        from: 'remote',
        to: 'local',
        direction: 'backward',
        command: rawCommand,
        label: 'Remote -> Local Repo only',
      };
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        'Fetched latest commits into origin/main inside Local Repo.',
        'Notice: Your Workspace files were NOT overwritten yet — safe to inspect first!',
      ];
      return s;
    }

    case 'pull_origin': {
      const missing = s.remoteCommits.filter(
        (rc) => !s.localCommits.some((lc) => lc.id === rc.id)
      );
      missing.reverse().forEach((c) => {
        s.localCommits.unshift({ ...c, branch: 'main' });
      });
      s.localCommits = s.localCommits.map((c) => ({ ...c, branch: 'main' }));
      if (!s.workspace.some((f) => f.name === 'api-fix.js')) {
        s.workspace.push({ name: 'api-fix.js', status: 'clean', detail: 'Pulled from GitHub' });
      }
      s.activeFlow = {
        from: 'remote',
        to: 'workspace',
        direction: 'backward',
        command: rawCommand,
        label: 'Fetch + Merge -> Workspace',
      };
      s.highlightStage = 'workspace';
      s.terminalLines = [
        `$ ${rawCommand}`,
        'Fast-forward merge complete! Remote commits are now live in Local Repo & Workspace.',
      ];
      return s;
    }

    case 'revert_head': {
      const latest = s.localCommits[0];
      if (!latest || latest.isRevert) {
        s.terminalLines = [`$ ${rawCommand}`, 'Latest commit is already reverted cleanly.'];
        return s;
      }
      const revId = 'r8d2f0a';
      s.localCommits.unshift({
        id: revId,
        message: `Revert "${latest.message}"`,
        branch: s.currentBranch,
        files: latest.files,
        author: s.config.name || 'Mamun',
        isRevert: true,
      });
      s.activeFlow = {
        from: 'local',
        to: 'local',
        direction: 'forward',
        command: rawCommand,
        label: `New inverse commit ${revId}`,
      };
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `[${s.currentBranch} ${revId}] Revert "${latest.message}"`,
        'Safe undo! Old history stays intact so teammates experience zero conflicts.',
      ];
      return s;
    }

    case 'push_revert': {
      s.remoteCommits = cloneState(s).localCommits;
      s.activeFlow = {
        from: 'local',
        to: 'remote',
        direction: 'forward',
        command: rawCommand,
        label: 'Pushed safe revert commit',
      };
      s.highlightStage = 'remote';
      s.terminalLines = [
        `$ ${rawCommand}`,
        'Successfully pushed revert commit to origin/main without rewriting shared history!',
      ];
      return s;
    }

    case 'push_feature': {
      const branch = effect.arg || s.currentBranch;
      s.remoteConnected = true;
      const latest = s.localCommits[0];
      if (latest && !s.remoteCommits.some((c) => c.id === latest.id)) {
        s.remoteCommits.unshift({
          ...latest,
          branch: `origin/${branch}`,
        });
      }
      s.activeFlow = {
        from: 'local',
        to: 'remote',
        direction: 'forward',
        command: rawCommand,
        label: `Pushed branch ${branch}`,
      };
      s.highlightStage = 'remote';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `* [new branch] ${branch} -> origin/${branch}`,
        'GitHub link ready: Open a Pull Request into main without touching main directly!',
      ];
      return s;
    }

    case 'open_pr': {
      const branch = effect.arg || 'feat/search';
      s.remoteConnected = true;
      if (!s.remoteCommits.some((c) => c.id === 'f6c21a4')) {
        s.remoteCommits.unshift({
          id: 'f6c21a4',
          message: 'PR #42 Open: Add live search bar',
          branch: `origin/${branch}`,
          files: ['search.tsx'],
          author: s.config.name || 'Mamun',
        });
      }
      s.activeFlow = {
        from: 'local',
        to: 'remote',
        direction: 'forward',
        command: rawCommand,
        label: `PR #42 opened (${branch} -> main)`,
      };
      s.highlightStage = 'remote';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Opened Pull Request #42 on GitHub: ${branch} -> main`,
        'CI checks passed! Reviewer Sara left 1 comment: "Please debounce search input by 250ms."',
      ];
      return s;
    }

    case 'pr_review_fix': {
      const fixId = 'a9e4b12';
      if (!s.localCommits.some((c) => c.id === fixId)) {
        s.localCommits.unshift({
          id: fixId,
          message: 'Address PR review: debounce input',
          branch: s.currentBranch,
          files: ['search.tsx'],
          author: s.config.name || 'Mamun',
        });
      }
      s.workspace = s.workspace.map((f) =>
        f.name === 'search.tsx'
          ? { ...f, status: 'clean', detail: 'Debounced 250ms (ready to push)' }
          : f
      );
      s.staging = [];
      s.activeFlow = {
        from: 'staging',
        to: 'local',
        direction: 'forward',
        command: rawCommand,
        label: `Review fix committed (${fixId})`,
      };
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `[${s.currentBranch} ${fixId}] Address PR review: debounce input`,
        'Now run `git push` — your existing Pull Request #42 will update automatically!',
      ];
      return s;
    }

    case 'push_pr_update': {
      const fix = s.localCommits.find((c) => c.id === 'a9e4b12') || s.localCommits[0];
      if (fix && !s.remoteCommits.some((c) => c.id === fix.id)) {
        s.remoteCommits.unshift({
          ...fix,
          branch: `origin/${s.currentBranch}`,
        });
      }
      s.activeFlow = {
        from: 'local',
        to: 'remote',
        direction: 'forward',
        command: rawCommand,
        label: 'PR #42 auto-updated!',
      };
      s.highlightStage = 'remote';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Updated origin/${s.currentBranch} -> Pull Request #42 automatically refreshed!`,
        'Reviewer Sara clicked "Approve" — ready to Squash & Merge into main.',
      ];
      return s;
    }

    case 'pr_merge_cleanup': {
      const mergedId = 'm42e8f1';
      if (!s.remoteCommits.some((c) => c.id === mergedId)) {
        s.remoteCommits.unshift({
          id: mergedId,
          message: 'Add live search bar (#42)',
          branch: 'origin/main',
          files: ['search.tsx'],
          author: 'Mamun',
          isMerge: true,
        });
      }
      if (!s.localCommits.some((c) => c.id === mergedId)) {
        s.localCommits.unshift({
          id: mergedId,
          message: 'Add live search bar (#42)',
          branch: 'main',
          files: ['search.tsx'],
          author: 'Mamun',
          isMerge: true,
        });
      }
      s.currentBranch = 'main';
      s.branches = ['main'];
      s.activeFlow = {
        from: 'remote',
        to: 'local',
        direction: 'backward',
        command: rawCommand,
        label: 'PR #42 merged & branch cleaned',
      };
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        'Squashed & merged PR #42 into origin/main, deleted feat/search, and synced local main!',
      ];
      return s;
    }

    case 'fork_clone': {
      s.initialized = true;
      s.remoteConnected = true;
      s.remoteUrl = 'git@github.com:mamun/ui-kit.git';
      s.localCommits = cloneState(s).remoteCommits.map((c) => ({ ...c, branch: 'main' }));
      s.workspace = [
        { name: 'Button.tsx', status: 'clean', detail: 'Cloned from YOUR fork' },
        { name: 'README.md', status: 'clean', detail: 'Cloned from YOUR fork' },
        { name: 'CONTRIBUTING.md', status: 'clean', detail: 'Read project guidelines!' },
      ];
      s.activeFlow = {
        from: 'remote',
        to: 'workspace',
        direction: 'backward',
        command: rawCommand,
        label: 'Cloned YOUR fork (origin)',
      };
      s.highlightStage = 'workspace';
      s.terminalLines = [
        `$ ${rawCommand}`,
        "Cloning into 'ui-kit'... origin -> git@github.com:mamun/ui-kit.git (YOUR fork)",
        'Tip: Always read CONTRIBUTING.md and link the original repo as "upstream" next.',
      ];
      return s;
    }

    case 'upstream_add': {
      s.remoteConnected = true;
      s.activeFlow = {
        from: 'local',
        to: 'remote',
        direction: 'inspect',
        command: rawCommand,
        label: 'Linked original repo as upstream',
      };
      s.highlightStage = 'remote';
      s.terminalLines = [
        `$ ${rawCommand}`,
        'origin   -> git@github.com:mamun/ui-kit.git (YOUR fork — push here)',
        'upstream -> git@github.com:awesome-org/ui-kit.git (ORIGINAL repo — pull updates here)',
      ];
      return s;
    }

    case 'push_fork_pr': {
      const branch = effect.arg || s.currentBranch;
      const fixId = 'c81a3f2';
      if (!s.localCommits.some((c) => c.id === fixId)) {
        s.localCommits.unshift({
          id: fixId,
          message: 'fix: add aria-label to icon Button',
          branch,
          files: ['Button.tsx'],
          author: s.config.name || 'Mamun',
        });
      }
      if (!s.remoteCommits.some((c) => c.id === fixId)) {
        s.remoteCommits.unshift({
          id: fixId,
          message: 'fix: add aria-label to icon Button',
          branch: `origin/${branch}`,
          files: ['Button.tsx'],
          author: s.config.name || 'Mamun',
        });
      }
      s.activeFlow = {
        from: 'local',
        to: 'remote',
        direction: 'forward',
        command: rawCommand,
        label: `Pushed ${branch} to YOUR fork`,
      };
      s.highlightStage = 'remote';
      s.terminalLines = [
        `$ ${rawCommand}`,
        `Pushed ${branch} to origin (mamun/ui-kit).`,
        'On GitHub click "Compare & pull request": mamun:fix/button-aria -> awesome-org:main!',
      ];
      return s;
    }

    case 'remote_list_upstream': {
      s.highlightStage = 'remote';
      s.activeFlow = {
        from: 'local',
        to: 'remote',
        direction: 'inspect',
        command: rawCommand,
        label: 'Inspecting origin & upstream',
      };
      s.terminalLines = [
        `$ ${rawCommand}`,
        'origin   git@github.com:mamun/ui-kit.git (fetch/push)  [YOUR FORK]',
        'upstream git@github.com:awesome-org/ui-kit.git (fetch) [ORIGINAL REPO]',
      ];
      return s;
    }

    case 'upstream_fetch': {
      const newUpstreamCommits = [
        {
          id: 'u94c2e1',
          message: 'feat: add Tooltip component (upstream)',
          branch: 'upstream/main',
          files: ['Tooltip.tsx'],
          author: 'Maintainer',
        },
        {
          id: 'u72b10a',
          message: 'fix: keyboard focus ring (upstream)',
          branch: 'upstream/main',
          files: ['Button.tsx'],
          author: 'Maintainer',
        },
      ];
      newUpstreamCommits.reverse().forEach((c) => {
        if (!s.localCommits.some((lc) => lc.id === c.id)) {
          s.localCommits.unshift(c);
        }
      });
      s.activeFlow = {
        from: 'remote',
        to: 'local',
        direction: 'backward',
        command: rawCommand,
        label: 'Fetched upstream/main -> Local',
      };
      s.highlightStage = 'local';
      s.terminalLines = [
        `$ ${rawCommand}`,
        'From github.com:awesome-org/ui-kit',
        '   3b2c9a0..u94c2e1  main -> upstream/main (2 new commits downloaded safely)',
      ];
      return s;
    }

    case 'upstream_merge': {
      const ensure = [
        {
          id: 'u72b10a',
          message: 'fix: keyboard focus ring (upstream)',
          branch: 'main',
          files: ['Button.tsx'],
          author: 'Maintainer',
        },
        {
          id: 'u94c2e1',
          message: 'feat: add Tooltip component (upstream)',
          branch: 'main',
          files: ['Tooltip.tsx'],
          author: 'Maintainer',
        },
      ];
      ensure.forEach((c) => {
        if (!s.localCommits.some((lc) => lc.id === c.id)) {
          s.localCommits.unshift(c);
        }
      });
      s.localCommits = s.localCommits.map((c) => ({ ...c, branch: 'main' }));
      if (!s.workspace.some((f) => f.name === 'Tooltip.tsx')) {
        s.workspace.push({ name: 'Tooltip.tsx', status: 'clean', detail: 'Synced from upstream' });
      }
      s.activeFlow = {
        from: 'local',
        to: 'workspace',
        direction: 'backward',
        command: rawCommand,
        label: 'Fast-forwarded local main',
      };
      s.highlightStage = 'workspace';
      s.terminalLines = [
        `$ ${rawCommand}`,
        'Updating 3b2c9a0..u94c2e1 — Fast-forward!',
        'Your local main now matches awesome-org/ui-kit 100%. Next: push to YOUR fork (origin)!',
      ];
      return s;
    }

    case 'upstream_push_origin': {
      s.remoteCommits = cloneState(s).localCommits.map((c) => ({
        ...c,
        branch: 'origin/main',
      }));
      s.activeFlow = {
        from: 'local',
        to: 'remote',
        direction: 'forward',
        command: rawCommand,
        label: 'Synced YOUR GitHub fork!',
      };
      s.highlightStage = 'remote';
      s.terminalLines = [
        `$ ${rawCommand}`,
        'To git@github.com:mamun/ui-kit.git -> 3b2c9a0..u94c2e1  main -> main',
        'Both your laptop AND your GitHub fork are now 100% up to date with upstream!',
      ];
      return s;
    }

    default:
      return s;
  }
}

const RAW_LESSONS: LessonStep[] = [
  {
    stepNumber: 1,
    category: 'Foundations',
    title: 'What Are Git & GitHub? Origins, Ownership & Purpose',
    subtitle: 'Understand the difference between Git (local tool) and GitHub (cloud platform) before writing a single command',
    storyTitle: 'First Things First — Git and GitHub Are Not the Same Thing',
    storyText:
      'People mix up **Git** and **GitHub** all the time. Think of **Git** as a CCTV camera and hard drive inside your room: it runs locally on your computer and tracks every change to your files with zero internet required. **GitHub** is the cloud vault where you upload copies of those snapshots to back them up or collaborate with a team. You can use Git completely offline without ever opening GitHub.',
    theorySummary:
      '• **What is Git?** A free, open-source **Distributed Version Control System (DVCS)** that tracks every change to files across Stages 1–3 (Workspace, Staging Area, Local Repo).\n• **Why was Git created?** In April 2005, the Linux kernel community lost free access to their proprietary tool (BitKeeper). Existing tools (CVS, SVN) were slow and needed a central server online for every commit. **Linus Torvalds** built Git in ~2 weeks to be blazingly fast, 100% offline/distributed, branch-friendly, and cryptographically tamper-proof.\n• **Who owns Git?** Nobody privately owns Git — it is open-source (GNU GPL v2), stewarded by the open-source community (led by Junio Hamano) under the Software Freedom Conservancy.\n• **What is GitHub & who owns it?** Launched in **2008**, GitHub is a web hosting platform built *on top of* Git for Stage 4 (Remote Repos), Pull Requests, Issues, and CI/CD. **Microsoft acquired GitHub in 2018** ($7.5B) and owns it today. (GitLab and Bitbucket are alternative cloud hosts using the exact same Git engine.)',
    proTip:
      'Interview classic: "Git is the version control engine on your computer (created by Linus Torvalds in 2005, open-source); GitHub is a cloud hosting website for Git repositories (founded 2008, owned by Microsoft since 2018)."',
    initialState: {
      initialized: true,
      config: { name: 'Linus', email: 'dev@kernel.org', autocrlf: 'true' },
      workspace: [
        { name: 'index.html', status: 'clean', detail: 'Tracked locally by Git' },
        { name: 'app.js', status: 'clean', detail: 'Works 100% offline' },
      ],
      staging: [
        { name: 'styles.css', status: 'staged', detail: 'Prepared locally by Git' },
      ],
      stash: [],
      localCommits: [
        { id: '2005git', message: 'Git engine runs locally (Stages 1–3)', branch: 'main', files: ['index.html'], author: 'Linus Torvalds' },
      ],
      remoteCommits: [
        { id: '2008hub', message: 'GitHub hosts cloud backups (Stage 4)', branch: 'origin/main', files: ['index.html'], author: 'Microsoft / GitHub' },
      ],
      remoteConnected: true,
      remoteUrl: 'https://github.com/user/project.git',
      sshReady: false,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Click "git --version" above to verify Git is installed on your machine.'],
      highlightStage: null,
    },
    commands: [
      {
        id: 's0-ver',
        command: 'git --version',
        label: 'Verify local Git CLI',
        kind: 'inspect',
        routeLabel: 'System check',
        effect: { type: 'version' },
      },
    ],
    vocabulary: [
      {
        term: 'Git (2005 · Open-Source)',
        meaning: 'Distributed Version Control System created by Linus Torvalds under GNU GPL v2 (owned by no company).',
        analogy: 'The CCTV camera and DVR hard drive inside your room — works completely offline.',
      },
      {
        term: 'GitHub (2008 · Microsoft)',
        meaning: 'Cloud web platform hosting Git Remote Repositories, Pull Requests, and Issues; acquired by Microsoft in 2018.',
        analogy: 'The off-site Cloud Vault where you upload recordings and collaborate with teammates.',
      },
      {
        term: 'DVCS (Distributed VCS)',
        meaning: 'Every developer downloads the entire project history locally instead of relying on a single central server.',
        analogy: 'Every team member keeps a full backup DVR in their own room — zero single point of failure.',
      },
      {
        term: 'BitKeeper & Linux (Why Created)',
        meaning: 'In 2005, BitKeeper revoked its free license for Linux developers, prompting Linus Torvalds to build Git in two weeks.',
        analogy: 'The old rented camera company cut off service, so the engineers built a faster, free camera everyone could own forever.',
      },
    ],
    flags: [
      {
        flag: 'Git vs GitHub',
        syntax: 'Local Tool vs Cloud Host',
        purpose: 'Git is installed on your OS (CLI/GUI); GitHub is a website hosting remote Git repos.',
        bestPractice: 'Remember: Git needs zero internet; GitHub is only needed when pushing, pulling, or collaborating online.',
      },
      {
        flag: 'Ownership',
        syntax: 'Open-Source vs Microsoft',
        purpose: 'Git is free open-source (GPL v2, maintained by community); GitHub is owned by Microsoft (since 2018).',
        bestPractice: 'Because Git is open-source, you can freely switch remotes between GitHub, GitLab, or Bitbucket anytime.',
      },
      {
        flag: '--help',
        syntax: 'git help <command>',
        purpose: 'Opens Git’s built-in offline documentation manual for any command right in your terminal.',
        bestPractice: 'Use `git commit --help` whenever you need offline reference for rare flags.',
      },
    ],
  },
  {
    stepNumber: 2,
    category: 'Setup',
    title: 'Installing the Camera in Your Room',
    subtitle: 'Initialize a repo with git init and learn how Workspace, Staging Area, and Local Repo work together',
    storyTitle: 'The CCTV Room Story — Chapter 1',
    storyText:
      'Imagine you want to record everything happening inside your room so later you can check what changed, who did it, and exactly when. First, you install a CCTV camera on the wall. In Git, your project folder is your room, and running `git init` mounts the camera by creating a hidden `.git` folder — activating Git’s 3-area local ecosystem right inside that same folder.',
    theorySummary:
      'Until you run `git init`, your folder is just an ordinary directory. Running `git init` creates a hidden `.git/` directory inside it, turning that single project folder into a 3-area local ecosystem:\n• **Workspace (Working Directory):** The actual files on your desk that you open and edit in your code editor.\n• **Staging Area (Index):** A preparation checklist inside `.git/index` where you line up only the exact changes you want in your next snapshot (`git add`).\n• **Local Repo (`.git/` Database):** The permanent history vault (`objects/`, `refs/`, `HEAD`, `config`) that locks in your snapshots when you run `git commit`.\nAll three live inside the exact same project folder on your machine: you edit in **Workspace** → pick changes into **Staging Area** → save permanently into **Local Repo** (and later push to a **Remote Repo** like GitHub).',
    proTip:
      'Never manually delete or edit files inside `.git/objects/`. If you ever want to stop tracking a folder completely, removing `.git/` turns it back into a plain folder without deleting your source code.',
    initialState: {
      initialized: false,
      config: { name: '', email: '', autocrlf: 'true' },
      workspace: [
        { name: 'index.html', status: 'untracked', detail: 'Plain file on desk' },
        { name: 'style.css', status: 'untracked', detail: 'Plain file on desk' },
      ],
      staging: [],
      stash: [],
      localCommits: [],
      remoteCommits: [],
      remoteConnected: false,
      remoteUrl: '',
      sshReady: false,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Click "git init" below to mount the Git camera inside this folder.'],
      highlightStage: 'workspace',
    },
    commands: [
      {
        id: 's1-ver',
        command: 'git --version',
        label: 'Check Git installed',
        kind: 'inspect',
        routeLabel: 'System check',
        effect: { type: 'version' },
      },
      {
        id: 's1-init',
        command: 'git init',
        label: 'Install .git camera',
        kind: 'do',
        routeLabel: 'Workspace → Local Repo',
        effect: { type: 'init' },
      },
      {
        id: 's1-uninit',
        command: 'rm -rf .git',
        label: 'Undo init (remove camera)',
        kind: 'undo',
        routeLabel: 'Local Repo → Workspace',
        effect: { type: 'uninit' },
      },
    ],
    vocabulary: [
      {
        term: 'Workspace (Working Directory)',
        meaning: 'The normal folder on your computer where you create and edit files.',
        analogy: 'Your physical room and desk where work actually happens.',
      },
      {
        term: 'Staging Area (Index)',
        meaning: 'The middle preparation zone (`.git/index`) where you pick which edits go into your next commit.',
        analogy: 'The photo desk where you arrange only the items you want in the next picture.',
      },
      {
        term: 'Local Repo (.git Directory)',
        meaning: 'The hidden database folder storing committed snapshots (`objects/`), branches (`refs/`), `HEAD`, and `config`.',
        analogy: 'The CCTV camera and its internal DVR hard drive locking footage permanently.',
      },
      {
        term: 'Repository (Repo)',
        meaning: 'A project folder actively tracked by Git along with its complete history.',
        analogy: 'A room equipped with continuous recording.',
      },
    ],
    flags: [
      {
        flag: '--version',
        syntax: 'git --version',
        purpose: 'Prints the installed Git binary version.',
        bestPractice: 'Run once on a new laptop to verify Git is installed in your PATH.',
      },
      {
        flag: '-b <branch>',
        syntax: 'git init -b main',
        purpose: 'Sets the initial default branch name immediately upon creation.',
        bestPractice: 'Use `-b main` so new repos match modern GitHub conventions.',
      },
    ],
  },
  {
    stepNumber: 2,
    category: 'Setup',
    title: 'Registering the Camera Operator',
    subtitle: 'Stamp every future recording with your name and email using git config',
    storyTitle: 'The CCTV Room Story — Chapter 2',
    storyText:
      'A security tape is far more useful when it watermarks WHO entered the room. Before saving your first snapshot, you register your operator badge with `git config`. From then on, every commit automatically carries your signature.',
    theorySummary:
      'Git supports three configuration scopes: `--system` (all OS users), `--global` (your user profile across every project), and local (default, stored inside `.git/config` for just this repository). Setting `core.autocrlf` also keeps Windows (`CRLF`) and macOS/Linux (`LF`) line endings clean.',
    proTip:
      'Use `--global` once for your personal name/email, and omit `--global` inside a work repo when you need a separate company email address.',
    initialState: {
      initialized: true,
      config: { name: '', email: '', autocrlf: 'unset' },
      workspace: [
        { name: 'index.html', status: 'untracked', detail: 'Waiting for first stage' },
        { name: 'style.css', status: 'untracked', detail: 'Waiting for first stage' },
      ],
      staging: [],
      stash: [],
      localCommits: [],
      remoteCommits: [],
      remoteConnected: false,
      remoteUrl: '',
      sshReady: false,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Set your operator identity so Git knows who makes each commit.'],
      highlightStage: 'local',
    },
    commands: [
      {
        id: 's2-name',
        command: 'git config --global user.name "Mamun"',
        label: 'Set global name',
        kind: 'do',
        routeLabel: 'Config → Local .git',
        effect: { type: 'config_set', arg: 'Mamun' },
      },
      {
        id: 's2-email',
        command: 'git config --global user.email "mamun@dev.io"',
        label: 'Set global email',
        kind: 'do',
        routeLabel: 'Config → Local .git',
        effect: { type: 'config_set', arg2: 'mamun@dev.io' },
      },
      {
        id: 's2-local',
        command: 'git config user.name "Team Member"',
        label: 'Override for this repo',
        kind: 'do',
        routeLabel: 'Local repo scope',
        effect: { type: 'config_set', arg: 'Team Member' },
      },
      {
        id: 's2-list',
        command: 'git config --list',
        label: 'Verify saved config',
        kind: 'inspect',
        routeLabel: 'Inspect .git/config',
        effect: { type: 'config_list' },
      },
    ],
    vocabulary: [
      {
        term: '--global scope',
        meaning: 'Stored in ~/.gitconfig and applied to every repository on your computer.',
        analogy: 'Your master operator ID card for every room you enter.',
      },
      {
        term: 'core.autocrlf',
        meaning: 'Automatically converts line endings between Windows and Unix systems.',
        analogy: 'Standardizing camera timestamps across time zones.',
      },
    ],
    flags: [
      {
        flag: '--global',
        syntax: 'git config --global user.name "Name"',
        purpose: 'Saves setting for all repositories owned by your OS account.',
        bestPractice: 'Always configure user.name and user.email globally first.',
      },
      {
        flag: '--list',
        syntax: 'git config --list',
        purpose: 'Displays all active Git configuration key-value pairs.',
        bestPractice: 'Check this if commits show the wrong author on GitHub.',
      },
      {
        flag: '-e',
        syntax: 'git config --global -e',
        purpose: 'Opens the global .gitconfig file directly in your default editor.',
        bestPractice: 'Great for quickly adding aliases or inspecting custom diff tools.',
      },
    ],
  },
  {
    stepNumber: 3,
    category: 'Daily Workflow',
    title: 'Checking the Room & Framing the Shot',
    subtitle: 'Inspect file states with git status and stage changes with git add',
    storyTitle: 'The CCTV Room Story — Chapter 3',
    storyText:
      'Your desk has three items on it, yet you may only want to photograph two of them right now. Before pressing record, you place the chosen files onto a dedicated "Photo Desk" called the Staging Area (`git add`). Checking `git status` tells you what is still loose on your desk versus neatly framed.',
    theorySummary:
      'The Staging Area (Index) is Git’s superpower: it lets you craft clean, focused snapshots instead of dumping every half-finished edit into one messy commit. `git add <file>` stages a single file, `git add .` stages everything in the current folder (including deletions), while `git add *` skips deleted files.',
    proTip:
      'Run `git status -s` for a super crisp short status: `??` means untracked, `M` in column 2 means modified in Workspace, and `A` or `M` in column 1 means staged in the Index.',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'index.html', status: 'untracked', detail: 'New file' },
        { name: 'style.css', status: 'untracked', detail: 'New file' },
        { name: 'app.js', status: 'untracked', detail: 'New file' },
      ],
      staging: [],
      stash: [],
      localCommits: [],
      remoteCommits: [],
      remoteConnected: false,
      remoteUrl: '',
      sshReady: false,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Stage one file or all files and watch them move from Workspace → Staging Area.'],
      highlightStage: 'workspace',
    },
    commands: [
      {
        id: 's3-status',
        command: 'git status -s',
        label: 'Check short status',
        kind: 'inspect',
        routeLabel: 'Inspect Workspace',
        effect: { type: 'status_short' },
      },
      {
        id: 's3-add1',
        command: 'git add index.html',
        label: 'Stage 1 file',
        kind: 'do',
        routeLabel: 'Workspace → Staging',
        effect: { type: 'add_file', arg: 'index.html' },
      },
      {
        id: 's3-addall',
        command: 'git add .',
        label: 'Stage all files',
        kind: 'do',
        routeLabel: 'Workspace → Staging',
        effect: { type: 'add_all' },
      },
      {
        id: 's3-unstage',
        command: 'git restore --staged .',
        label: 'Undo staging',
        kind: 'undo',
        routeLabel: 'Staging → Workspace',
        effect: { type: 'restore_staged' },
      },
    ],
    vocabulary: [
      {
        term: 'Staging Area (Index)',
        meaning: 'An intermediate blueprint listing exactly which changes will enter the next commit.',
        analogy: 'The photo desk where you arrange items before pressing the camera shutter.',
      },
      {
        term: 'Untracked File',
        meaning: 'A brand-new file in your Workspace that Git has never recorded in any commit yet.',
        analogy: 'A new object placed in your room that has never appeared on camera.',
      },
    ],
    flags: [
      {
        flag: '.',
        syntax: 'git add .',
        purpose: 'Stages all new, modified, and deleted files in the current directory downward.',
        bestPractice: 'Best everyday shorthand after reviewing `git status`.',
      },
      {
        flag: '--all / -A',
        syntax: 'git add --all',
        purpose: 'Stages changes across the entire repository regardless of your subfolder.',
        bestPractice: 'Use when working inside a nested subfolder like `src/components/`.',
      },
      {
        flag: '-s',
        syntax: 'git status -s',
        purpose: 'Compact two-column status output showing Staging vs Workspace states.',
        bestPractice: 'Fastest way to scan large projects at a glance.',
      },
    ],
  },
  {
    stepNumber: 4,
    category: 'Daily Workflow',
    title: 'Saving a Permanent Snapshot',
    subtitle: 'Record staged files into Local Repo history with git commit',
    storyTitle: 'The CCTV Room Story — Chapter 4',
    storyText:
      'Everything on the Photo Desk looks spotless. Now you press the shutter button (`git commit -m "..."`). The camera saves a permanent, tamper-proof timestamped snapshot onto your Local Repo hard drive with a unique serial number (commit hash) and your label.',
    theorySummary:
      'A commit permanently saves the contents of the Staging Area into `.git/objects/`. Each commit receives a unique 40-character SHA-1 ID (commonly shortened to 7 characters like `a1b2c3d`). You can also use `git commit -am "msg"` to skip `git add` for already-tracked modified files, or `git commit --amend` to fix a typo in your last commit.',
    proTip:
      'Write commit messages in the imperative mood ("Add navbar layout", not "Added stuff") so your history reads like a clear timeline of actions.',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'index.html', status: 'clean', detail: 'Staged in index' },
        { name: 'style.css', status: 'clean', detail: 'Staged in index' },
        { name: 'app.js', status: 'modified', detail: 'Tracked edit in Workspace' },
      ],
      staging: [
        { name: 'index.html', status: 'staged', detail: 'Ready to commit' },
        { name: 'style.css', status: 'staged', detail: 'Ready to commit' },
      ],
      stash: [],
      localCommits: [
        { id: '1a0c7d8', message: 'Initial project setup', branch: 'main', files: ['README.md'], author: 'Mamun' },
      ],
      remoteCommits: [],
      remoteConnected: false,
      remoteUrl: '',
      sshReady: false,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Press "git commit -m" to save staged files, then try --amend or undo with reset --soft!'],
      highlightStage: 'staging',
    },
    commands: [
      {
        id: 's4-commit',
        command: 'git commit -m "Build homepage"',
        label: 'Save staged snapshot',
        kind: 'do',
        routeLabel: 'Staging → Local Repo',
        effect: { type: 'commit', arg: 'Build homepage' },
      },
      {
        id: 's4-commit-am',
        command: 'git commit -am "Update app.js"',
        label: 'Auto-stage & commit (-am)',
        kind: 'do',
        routeLabel: 'Workspace → Local Repo',
        effect: { type: 'commit_am', arg: 'Update app.js' },
      },
      {
        id: 's4-amend',
        command: 'git commit --amend -m "Polish homepage"',
        label: 'Rewrite latest commit',
        kind: 'do',
        routeLabel: 'Update Local HEAD',
        effect: { type: 'commit_amend', arg: 'Polish homepage' },
      },
      {
        id: 's4-undo',
        command: 'git reset --soft HEAD~1',
        label: 'Undo commit (keep staged)',
        kind: 'undo',
        routeLabel: 'Local Repo → Staging',
        effect: { type: 'reset_soft' },
      },
    ],
    vocabulary: [
      {
        term: 'Commit',
        meaning: 'An immutable snapshot of staged files, author metadata, timestamp, and parent pointer.',
        analogy: 'A saved, sealed video frame written to your CCTV hard drive.',
      },
      {
        term: 'SHA-1 Commit Hash',
        meaning: 'Unique fingerprint (e.g. a7c91e2) calculated from the commit contents and parent.',
        analogy: 'Tamper-proof evidence seal number on each security frame.',
      },
    ],
    flags: [
      {
        flag: '-m "msg"',
        syntax: 'git commit -m "Add login form"',
        purpose: 'Provides the commit message inline without opening an external text editor.',
        bestPractice: 'Keep subject lines under 50 characters and describe *why* or *what*.',
      },
      {
        flag: '-am "msg"',
        syntax: 'git commit -am "Fix typo"',
        purpose: 'Auto-stages modified/deleted tracked files and commits in one command.',
        bestPractice: 'Remember: `-a` ignores brand-new untracked files!',
      },
      {
        flag: '--amend',
        syntax: 'git commit --amend -m "Better msg"',
        purpose: 'Rewrites the latest local commit message or adds forgotten staged files.',
        bestPractice: 'Only amend commits that have NOT been pushed to a shared remote yet.',
      },
    ],
  },
  {
    stepNumber: 5,
    category: 'Inspect & Diff',
    title: 'Inspecting the Tape & Differences',
    subtitle: 'Compare exact line changes across stages with git diff and git show',
    storyTitle: 'The CCTV Room Story — Chapter 5',
    storyText:
      'Before sealing another frame, you want to see exactly what moved on your desk since the last recording. `git diff` holds two frames side-by-side: red minus (`-`) lines show what was removed, and green plus (`+`) lines show what was added.',
    theorySummary:
      '`git diff` by itself compares **Workspace vs. Staging Area**. Once you run `git add`, `git diff` becomes empty — so you add `--staged` (`git diff --staged`) to compare **Staging Area vs. Local Repo (HEAD)**. To inspect any single past commit in full detail, use `git show <commit-id>`.',
    proTip:
      'Always run `git diff --staged` right before committing to catch stray `console.log()` lines or accidental secrets.',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'app.js', status: 'modified', detail: '1 line changed (unstaged)' },
        { name: 'styles.css', status: 'clean', detail: 'Staged changes queued' },
      ],
      staging: [
        { name: 'styles.css', status: 'staged', detail: '+ .hero background color' },
      ],
      stash: [],
      localCommits: [
        { id: '9d2a1c4', message: 'Build initial homepage', branch: 'main', files: ['index.html', 'styles.css', 'app.js'], author: 'Mamun' },
      ],
      remoteCommits: [],
      remoteConnected: false,
      remoteUrl: '',
      sshReady: false,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Inspect differences between Workspace, Staging Area, and Local Repo.'],
      highlightStage: 'workspace',
    },
    commands: [
      {
        id: 's5-diff',
        command: 'git diff',
        label: 'Diff Workspace vs Staging',
        kind: 'inspect',
        routeLabel: 'Workspace ↔ Staging',
        effect: { type: 'diff_workspace' },
      },
      {
        id: 's5-diff-staged',
        command: 'git diff --staged',
        label: 'Diff Staging vs Local',
        kind: 'inspect',
        routeLabel: 'Staging ↔ Local Repo',
        effect: { type: 'diff_staged' },
      },
      {
        id: 's5-show',
        command: 'git show 9d2a1c4',
        label: 'Inspect commit details',
        kind: 'inspect',
        routeLabel: 'Inspect Local Commit',
        effect: { type: 'show_commit' },
      },
    ],
    vocabulary: [
      {
        term: 'Diff (Patch)',
        meaning: 'A line-by-line delta showing exact insertions (+) and deletions (-) between two states.',
        analogy: 'Overlaying two CCTV frames to highlight only the pixels that moved.',
      },
      {
        term: 'HEAD',
        meaning: 'A pointer marking the exact commit and branch you are currently viewing.',
        analogy: 'The "You Are Here" playback cursor on your security timeline.',
      },
    ],
    flags: [
      {
        flag: '--staged',
        syntax: 'git diff --staged',
        purpose: 'Shows changes already staged that will be included in the next commit.',
        bestPractice: 'Equivalent to `--cached`; `--staged` is clearer and easier to remember.',
      },
      {
        flag: '<id1> <id2>',
        syntax: 'git diff 9d2a1c4 b7e309d',
        purpose: 'Compares any two commits directly across history.',
        bestPractice: 'Ideal when tracking down which commit introduced a bug.',
      },
    ],
  },
  {
    stepNumber: 6,
    category: 'Inspect & Diff',
    title: 'Viewing the Security Log & Time Travel',
    subtitle: 'Browse commit timelines with git log and preview older snapshots',
    storyTitle: 'The CCTV Room Story — Chapter 6',
    storyText:
      'Every evening your DVR keeps an indexed logbook of every snapshot ever saved. Running `git log --oneline` displays a clean timeline, and `git checkout <commit-id>` lets you temporarily rewind the monitor to watch an earlier moment without erasing today’s tape.',
    theorySummary:
      '`git log` prints full author, date, hash, and message details starting from `HEAD` backward. Adding `--oneline` condenses each commit into a single readable row, while `--stat` shows which files changed. Checking out an old commit puts you in "Detached HEAD" read-only preview mode; return safely with `git checkout main`.',
    proTip:
      'Combine flags for an ultra-clear terminal graph: `git log --oneline --graph --all`.',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'index.html', status: 'clean', detail: 'Matches HEAD (e81c2b0)' },
        { name: 'app.js', status: 'clean', detail: 'Matches HEAD (e81c2b0)' },
      ],
      staging: [],
      stash: [],
      localCommits: [
        { id: 'e81c2b0', message: 'Add interactive search bar', branch: 'main', files: ['app.js'], author: 'Mamun' },
        { id: '4f9b3a2', message: 'Style responsive header', branch: 'main', files: ['style.css'], author: 'Mamun' },
        { id: '1a0c7d8', message: 'Initial project scaffold', branch: 'main', files: ['index.html'], author: 'Mamun' },
      ],
      remoteCommits: [],
      remoteConnected: false,
      remoteUrl: '',
      sshReady: false,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Explore the commit timeline and try previewing an earlier snapshot.'],
      highlightStage: 'local',
    },
    commands: [
      {
        id: 's6-oneline',
        command: 'git log --oneline',
        label: 'Compact history',
        kind: 'inspect',
        routeLabel: 'Inspect Local Repo',
        effect: { type: 'log_oneline' },
      },
      {
        id: 's6-stat',
        command: 'git log --stat',
        label: 'History with file stats',
        kind: 'inspect',
        routeLabel: 'Inspect Local Repo',
        effect: { type: 'log_stat' },
      },
      {
        id: 's6-past',
        command: 'git checkout 1a0c7d8',
        label: 'Preview past commit',
        kind: 'do',
        routeLabel: 'Local Repo → Workspace',
        effect: { type: 'checkout_past' },
      },
      {
        id: 's6-return',
        command: 'git checkout main',
        label: 'Return to latest main',
        kind: 'undo',
        routeLabel: 'Reattach HEAD',
        effect: { type: 'checkout_main' },
      },
    ],
    vocabulary: [
      {
        term: 'Detached HEAD',
        meaning: 'HEAD points directly to an older commit ID rather than a branch tip.',
        analogy: 'Pausing the DVR on yesterday’s footage — great for viewing, not for recording new tape unless you start a branch.',
      },
      {
        term: 'Commit Graph',
        meaning: 'The chain of commits where each snapshot points back to its parent commit.',
        analogy: 'Sequential frames stitched together on a security reel.',
      },
    ],
    flags: [
      {
        flag: '--oneline',
        syntax: 'git log --oneline',
        purpose: 'Shows short 7-char hash and title on one line per commit.',
        bestPractice: 'Your go-to command to quickly grab commit IDs for reset, diff, or cherry-pick.',
      },
      {
        flag: '--reverse',
        syntax: 'git log --oneline --reverse',
        purpose: 'Prints commits chronologically from oldest to newest.',
        bestPractice: 'Helpful when onboarding onto a brand-new codebase to see how it started.',
      },
      {
        flag: '--stat',
        syntax: 'git log --stat',
        purpose: 'Lists modified files and line counts under every commit.',
        bestPractice: 'Use before code reviews to gauge the scope of recent commits.',
      },
    ],
  },
  {
    stepNumber: 7,
    category: 'Undo & Recovery',
    title: 'Moving Backward — Unstaging & Discarding',
    subtitle: 'Safely pull files back from Staging or wipe messy Workspace edits',
    storyTitle: 'The CCTV Room Story — Chapter 7',
    storyText:
      'Oops — you placed a half-written draft onto the Photo Desk by mistake, or spilled coffee over an unsaved experiment on your desk. `git restore --staged .` gently lifts items off the Photo Desk back onto your desk without losing your typing. `git restore .` resets your desk back to the last clean photograph.',
    theorySummary:
      'Modern Git introduced `git restore` to make backward commands crystal clear: `--staged` moves changes from **Staging → Workspace** (non-destructive). Without `--staged`, `git restore .` reverts **Workspace → Last Committed State** (erases unsaved edits). To remove brand-new untracked clutter files, preview first with `git clean -fd -n`, then run `git clean -fd`.',
    proTip:
      'Always test `git clean -fd -n` (dry run) before `git clean -fd`, because untracked files deleted by `git clean` cannot be recovered by Git!',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'app.js', status: 'modified', detail: 'Broken experiment' },
        { name: 'style.css', status: 'clean', detail: 'Staged by mistake' },
        { name: 'temp-debug.log', status: 'untracked', detail: 'Untracked clutter' },
      ],
      staging: [
        { name: 'style.css', status: 'staged', detail: 'Accidently staged' },
      ],
      stash: [],
      localCommits: [
        { id: '7b5e2d1', message: 'Stable working homepage', branch: 'main', files: ['app.js', 'style.css'], author: 'Mamun' },
      ],
      remoteCommits: [],
      remoteConnected: false,
      remoteUrl: '',
      sshReady: false,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Practice moving changes backward safely from Staging and Workspace.'],
      highlightStage: 'staging',
    },
    commands: [
      {
        id: 's7-unstage',
        command: 'git restore --staged .',
        label: 'Unstage (Staging → Workspace)',
        kind: 'undo',
        routeLabel: 'Staging → Workspace',
        effect: { type: 'restore_staged' },
      },
      {
        id: 's7-discard',
        command: 'git restore .',
        label: 'Discard Workspace edits',
        kind: 'undo',
        routeLabel: 'Local → Workspace',
        effect: { type: 'restore_workspace' },
      },
      {
        id: 's7-clean-n',
        command: 'git clean -fd -n',
        label: 'Preview untracked delete',
        kind: 'inspect',
        routeLabel: 'Dry run check',
        effect: { type: 'clean_preview' },
      },
      {
        id: 's7-clean',
        command: 'git clean -fd',
        label: 'Delete untracked files',
        kind: 'undo',
        routeLabel: 'Clean Workspace',
        effect: { type: 'clean_force' },
      },
    ],
    vocabulary: [
      {
        term: 'Unstage',
        meaning: 'Removing a change from the Staging Area while keeping your actual edits intact in Workspace.',
        analogy: 'Taking an item off the photo desk and setting it back on your workbench.',
      },
      {
        term: 'Dry Run (-n)',
        meaning: 'Simulating a destructive command to print what WOULD happen without deleting anything.',
        analogy: 'Checking the trash bin label before emptying it.',
      },
    ],
    flags: [
      {
        flag: '--staged',
        syntax: 'git restore --staged app.js',
        purpose: 'Moves file backward from Staging Area to Workspace (replaces old `git reset HEAD`).',
        bestPractice: '100% safe — never loses your typed code.',
      },
      {
        flag: '--source=HEAD~1',
        syntax: 'git restore --source=HEAD~1 app.js',
        purpose: 'Restores one specific file from an earlier commit snapshot.',
        bestPractice: 'Surgical way to rescue a single deleted or broken file.',
      },
      {
        flag: '-fd',
        syntax: 'git clean -fd',
        purpose: 'Forcefully removes untracked files (`-f`) and untracked directories (`-d`).',
        bestPractice: 'Always run with `-n` first to inspect what will be erased.',
      },
    ],
  },
  {
    stepNumber: 8,
    category: 'Undo & Recovery',
    title: 'Rewinding Local Commits with git reset',
    subtitle: 'Understand the 3 modes of git reset: --soft, default (--mixed), and --hard',
    storyTitle: 'The CCTV Room Story — Chapter 8',
    storyText:
      'What if you already pressed the shutter and saved a commit to your Local Repo, then realized you committed too early? `git reset HEAD~1` rewinds the DVR back by 1 snapshot. You choose how gentle or aggressive the rewind is: keep items on the Photo Desk (`--soft`), set them back on your desk (`default`), or sweep the desk completely clean (`--hard`).',
    theorySummary:
      'Memorize these three exact backward paths from Local Repo:\n• `git reset --soft HEAD~1` → **Local → Staging** (commit undone, changes stay staged)\n• `git reset HEAD~1` → **Local → Workspace** (commit undone, changes stay unstaged)\n• `git reset --hard HEAD~1` → **Destructive rewind** (erases commit, Staging, AND Workspace edits).',
    proTip:
      'Use `git reset` freely on LOCAL commits you haven’t shared yet. Never use `git reset --hard` on commits teammates have already pulled!',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'index.html', status: 'clean', detail: 'Committed' },
        { name: 'payment.js', status: 'clean', detail: 'Committed in 8c4f1a9' },
      ],
      staging: [],
      stash: [],
      localCommits: [
        { id: '8c4f1a9', message: 'WIP payment test (committed too early)', branch: 'main', files: ['payment.js'], author: 'Mamun' },
        { id: '3e9d2b5', message: 'Add product catalog', branch: 'main', files: ['index.html'], author: 'Mamun' },
      ],
      remoteCommits: [],
      remoteConnected: false,
      remoteUrl: '',
      sshReady: false,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Compare --soft, default (--mixed), and --hard reset from Local Repo.'],
      highlightStage: 'local',
    },
    commands: [
      {
        id: 's8-soft',
        command: 'git reset --soft HEAD~1',
        label: 'Soft reset (Local → Staging)',
        kind: 'undo',
        routeLabel: 'Local → Staging',
        effect: { type: 'reset_soft' },
      },
      {
        id: 's8-mixed',
        command: 'git reset HEAD~1',
        label: 'Mixed reset (Local → Workspace)',
        kind: 'undo',
        routeLabel: 'Local → Workspace',
        effect: { type: 'reset_mixed' },
      },
      {
        id: 's8-hard',
        command: 'git reset --hard HEAD~1',
        label: 'Hard reset (Destructive)',
        kind: 'undo',
        routeLabel: 'Erase Commit + Edits',
        effect: { type: 'reset_hard' },
      },
      {
        id: 's8-recommit',
        command: 'git commit -m "Clean payment module"',
        label: 'Re-commit cleanly',
        kind: 'do',
        routeLabel: 'Staging → Local',
        effect: { type: 'commit', arg: 'Clean payment module' },
      },
    ],
    vocabulary: [
      {
        term: 'HEAD~1',
        meaning: 'Shorthand referring to the parent commit immediately before HEAD (1 step back).',
        analogy: 'One frame earlier on the security reel (`HEAD~2` is two frames earlier).',
      },
      {
        term: '--soft vs --mixed vs --hard',
        meaning: 'Controls whether Staging Area and Workspace are preserved or wiped when moving HEAD back.',
        analogy: 'Rewinding the tape while choosing whether to keep your desk props in place.',
      },
    ],
    flags: [
      {
        flag: '--soft',
        syntax: 'git reset --soft HEAD~1',
        purpose: 'Moves HEAD back 1 commit; keeps all changes staged.',
        bestPractice: 'Best for combining two quick commits into one cleaner commit.',
      },
      {
        flag: '(default / --mixed)',
        syntax: 'git reset HEAD~1',
        purpose: 'Moves HEAD back 1 commit; keeps changes in Workspace as unstaged.',
        bestPractice: 'Best when you want to split one large commit into smaller commits.',
      },
      {
        flag: '--hard',
        syntax: 'git reset --hard HEAD~1',
        purpose: 'Resets HEAD, Staging Area, and Workspace completely — erases uncommitted work.',
        bestPractice: 'Use with caution only when you truly want to throw away changes.',
      },
    ],
  },
  {
    stepNumber: 9,
    category: 'Daily Workflow',
    title: 'File Operations & Camera Blind Spots',
    subtitle: 'Remove, rename, and ignore private files using git rm, git mv, and .gitignore',
    storyTitle: 'The CCTV Room Story — Chapter 9',
    storyText:
      'Some things in your room — like your personal diary, passwords (`.env`), or giant heavy Photoshop files (`*.psd`) — should NEVER be caught on camera. Creating a `.gitignore` file puts a privacy blind spot over matching filenames. Meanwhile, `git rm --cached` stops filming a secret file without deleting it from your desk.',
    theorySummary:
      'Use `git rm file` to delete a file from both Workspace and Staging at once. Use `git rm --cached file` to untrack a file (like `.env`) while keeping it safely on your disk. Use `git mv old new` to rename and stage in one step. Put patterns like `*.psd`, `*.log`, `node_modules/`, and `.env` inside `.gitignore`.',
    proTip:
      'If you already committed a `.env` file before adding it to `.gitignore`, `.gitignore` alone will not untrack it — run `git rm --cached .env` first!',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'file1.js', status: 'clean', detail: 'Tracked script' },
        { name: 'old-notes.txt', status: 'clean', detail: 'Obsolete file' },
        { name: 'secrets.env', status: 'clean', detail: 'Accidentally staged!' },
        { name: 'banner.psd', status: 'untracked', detail: 'Heavy 200MB design file' },
      ],
      staging: [
        { name: 'secrets.env', status: 'staged', detail: 'Should not be committed!' },
      ],
      stash: [],
      localCommits: [
        { id: '5c8a4b2', message: 'Add initial assets', branch: 'main', files: ['file1.js', 'old-notes.txt'], author: 'Mamun' },
      ],
      remoteCommits: [],
      remoteConnected: false,
      remoteUrl: '',
      sshReady: false,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Untrack secrets.env, create .gitignore blind spots, rename file1.js, or remove old-notes.txt.'],
      highlightStage: 'workspace',
    },
    commands: [
      {
        id: 's9-rm-cached',
        command: 'git rm --cached secrets.env',
        label: 'Untrack (keep on disk)',
        kind: 'undo',
        routeLabel: 'Staging → Untracked',
        effect: { type: 'rm_cached', arg: 'secrets.env' },
      },
      {
        id: 's9-ignore',
        command: 'touch .gitignore',
        label: 'Add *.psd & .env rules',
        kind: 'do',
        routeLabel: 'Mask Workspace files',
        effect: { type: 'create_gitignore' },
      },
      {
        id: 's9-mv',
        command: 'git mv file1.js main.js',
        label: 'Rename & stage',
        kind: 'do',
        routeLabel: 'Workspace → Staging',
        effect: { type: 'mv_file', arg: 'file1.js', arg2: 'main.js' },
      },
      {
        id: 's9-rm',
        command: 'git rm old-notes.txt',
        label: 'Delete & stage removal',
        kind: 'do',
        routeLabel: 'Remove from Disk + Index',
        effect: { type: 'rm_file', arg: 'old-notes.txt' },
      },
    ],
    vocabulary: [
      {
        term: '.gitignore',
        meaning: 'A plain text file listing filename patterns Git must ignore completely.',
        analogy: 'Privacy curtains covering specific spots in your room from the camera.',
      },
      {
        term: '--cached',
        meaning: 'Targets only the Staging Area (Index) without touching the actual file on disk.',
        analogy: 'Removing an item from the photo list while leaving it sitting on your desk.',
      },
    ],
    flags: [
      {
        flag: '--cached',
        syntax: 'git rm --cached secrets.env',
        purpose: 'Stops tracking a file in Git while keeping the file intact on your computer.',
        bestPractice: 'Essential whenever you accidentally stage `.env` or build output.',
      },
      {
        flag: '-r',
        syntax: 'git rm --cached -r dist/',
        purpose: 'Recursively removes an entire folder from Git tracking.',
        bestPractice: 'Always pair `-r` with `--cached` if you want to keep the folder locally.',
      },
      {
        flag: '-f',
        syntax: 'git rm -f temp.txt',
        purpose: 'Forces deletion even when the file has unsaved local edits.',
        bestPractice: 'Use only when you are sure you never need the modified version.',
      },
    ],
  },
  {
    stepNumber: 10,
    category: 'Stash & Clean',
    title: 'The Temporary Drawer — Git Stash',
    subtitle: 'Shelve unfinished edits cleanly with git stash and restore them later',
    storyTitle: 'The CCTV Room Story — Chapter 10',
    storyText:
      'You are halfway through reorganizing your desk when an urgent bug call arrives and you need a spotless room right now — without making a half-baked commit. `git stash` sweeps your messy work into a hidden side drawer. Once the urgent task finishes, `git stash pop` puts everything right back onto your desk.',
    theorySummary:
      'Stashing saves modified tracked files onto a temporary LIFO stack inside `.git/refs/stash` and resets your Workspace to a clean `HEAD`. Use `git stash list` to see saved drawers, `git stash apply` to restore while keeping a backup in the drawer, or `git stash pop` to restore and remove the drawer entry.',
    proTip:
      'Use `git stash -u` (include untracked) if your unfinished feature also includes brand-new files that haven’t been staged yet.',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'index.html', status: 'clean', detail: 'Clean' },
        { name: 'checkout.js', status: 'modified', detail: 'Half-finished work (not ready to commit)' },
      ],
      staging: [],
      stash: [],
      localCommits: [
        { id: 'c2e41a8', message: 'Release v1.0 homepage', branch: 'main', files: ['index.html', 'checkout.js'], author: 'Mamun' },
      ],
      remoteCommits: [],
      remoteConnected: false,
      remoteUrl: '',
      sshReady: false,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Shelve your unfinished edits to the Stash drawer, inspect the list, then pop them back.'],
      highlightStage: 'workspace',
    },
    commands: [
      {
        id: 's10-push',
        command: 'git stash',
        label: 'Shelve edits to drawer',
        kind: 'do',
        routeLabel: 'Workspace → Stash',
        effect: { type: 'stash_push' },
      },
      {
        id: 's10-list',
        command: 'git stash list',
        label: 'List stashed items',
        kind: 'inspect',
        routeLabel: 'Inspect Stash Drawer',
        effect: { type: 'stash_list' },
      },
      {
        id: 's10-pop',
        command: 'git stash pop',
        label: 'Restore & empty drawer',
        kind: 'undo',
        routeLabel: 'Stash → Workspace',
        effect: { type: 'stash_pop' },
      },
    ],
    vocabulary: [
      {
        term: 'Stash Stack',
        meaning: 'Temporary local shelf storing uncommitted Workspace and Staging changes.',
        analogy: 'A quick-hide desk drawer for half-finished projects.',
      },
      {
        term: 'pop vs apply',
        meaning: '`pop` restores the latest stash AND deletes it from the stack; `apply` restores it and keeps a copy.',
        analogy: 'Emptying the drawer back onto your desk (`pop`) vs photocopying what’s inside (`apply`).',
      },
    ],
    flags: [
      {
        flag: '-u',
        syntax: 'git stash -u',
        purpose: 'Stashes both modified tracked files AND brand-new untracked files.',
        bestPractice: 'Use `-u` whenever your work-in-progress includes newly created files.',
      },
      {
        flag: 'push -m',
        syntax: 'git stash push -m "checkout wip"',
        purpose: 'Labels your stash entry with a clear description.',
        bestPractice: 'Essential if you keep more than one stash in your drawer.',
      },
    ],
  },
  {
    stepNumber: 11,
    category: 'Branch & Merge',
    title: 'Parallel Rooms — Branching in Git',
    subtitle: 'Isolate new features safely with git branch and git checkout -b',
    storyTitle: 'The CCTV Room Story — Chapter 11',
    storyText:
      'Suppose you want to repaint your room bright blue, but you aren’t sure if you will like it. Instead of risking your neat `main` room, Git instantaneously clones your room into a parallel universe called a Branch (`feature/login`). Paint, experiment, and record snapshots freely — your original `main` room stays 100% untouched!',
    theorySummary:
      'A Git branch is simply a lightweight movable pointer to a commit — creating one takes milliseconds and almost zero disk space. `git checkout -b feature/login` (or modern `git switch -c feature/login`) creates a new branch and moves `HEAD` onto it immediately. Switch back anytime with `git checkout main`, and delete finished branches with `git branch -d`.',
    proTip:
      'Keep `main` always deployable and clean. Create a short, descriptive branch (`feature/auth`, `fix/navbar`) for every task.',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'index.html', status: 'clean', detail: 'Stable on main' },
        { name: 'app.js', status: 'clean', detail: 'Stable on main' },
      ],
      staging: [],
      stash: [],
      localCommits: [
        { id: '2b4d9a1', message: 'Production homepage v1', branch: 'main', files: ['index.html', 'app.js'], author: 'Mamun' },
      ],
      remoteCommits: [],
      remoteConnected: false,
      remoteUrl: '',
      sshReady: false,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Create a parallel branch, record a commit on it, then switch back to main.'],
      highlightStage: 'local',
    },
    commands: [
      {
        id: 's11-create',
        command: 'git checkout -b feature/login',
        label: 'Create & switch branch',
        kind: 'do',
        routeLabel: 'New branch pointer',
        effect: { type: 'branch_create', arg: 'feature/login' },
      },
      {
        id: 's11-commit',
        command: 'git commit -m "Build login form"',
        label: 'Commit on feature branch',
        kind: 'do',
        routeLabel: 'Save on feature/login',
        effect: { type: 'branch_commit', arg: 'Build login form' },
      },
      {
        id: 's11-main',
        command: 'git checkout main',
        label: 'Switch back to main',
        kind: 'do',
        routeLabel: 'Move HEAD → main',
        effect: { type: 'branch_switch', arg: 'main' },
      },
      {
        id: 's11-del',
        command: 'git branch -D feature/login',
        label: 'Delete feature branch',
        kind: 'undo',
        routeLabel: 'Remove branch pointer',
        effect: { type: 'branch_delete', arg: 'feature/login' },
      },
    ],
    vocabulary: [
      {
        term: 'Branch',
        meaning: 'An independent line of development pointing to a specific commit tip.',
        analogy: 'A parallel copy of your room where experiments cannot disturb the main room.',
      },
      {
        term: 'Checkout / Switch',
        meaning: 'Moves HEAD to another branch and updates your Workspace files to match it.',
        analogy: 'Walking through a doorway from your main room into your experimental room.',
      },
    ],
    flags: [
      {
        flag: '-b',
        syntax: 'git checkout -b feature/login',
        purpose: 'Creates a brand-new branch and switches into it in a single command.',
        bestPractice: 'Shorthand replacing two separate steps (`git branch` + `git checkout`).',
      },
      {
        flag: '-d vs -D',
        syntax: 'git branch -d feature/login',
        purpose: '`-d` safely deletes only merged branches; `-D` forcefully deletes unmerged branches.',
        bestPractice: 'Always try lowercase `-d` first so Git warns you about unmerged work.',
      },
    ],
  },
  {
    stepNumber: 12,
    category: 'Branch & Merge',
    title: 'Combining Rooms — Merging & Cherry-Pick',
    subtitle: 'Integrate branches via Fast-Forward, 3-Way Merge, Rebase, or Cherry-Pick',
    storyTitle: 'The CCTV Room Story — Chapter 12',
    storyText:
      'Your experimental room looks fantastic! Now you want to bring those upgrades back into your `main` room. If nobody touched `main` while you worked, Git simply slides `main` forward (**Fast-Forward Merge**). If `main` also changed meanwhile, Git weaves both rooms together into a **3-Way Merge Commit**. Want only one specific furniture piece? Use `git cherry-pick`!',
    theorySummary:
      'Always switch to the receiving branch (`git checkout main`) first, then run `git merge feature/login`. Git chooses **Fast-Forward** when history is linear, or creates a **3-Way Merge Commit** with two parents when branches diverged. For a straight linear timeline, teams also use `git rebase -i`, and for picking a single commit across branches, `git cherry-pick <id>`. Visit the **Branch Lab** tab above to experiment interactively with every merge type!',
    proTip:
      'Never rebase commits that have already been pushed to a shared team branch — rebase rewrites commit hashes!',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'index.html', status: 'clean', detail: 'On main' },
        { name: 'app.js', status: 'clean', detail: 'On main' },
      ],
      staging: [],
      stash: [],
      localCommits: [
        { id: '2b4d9a1', message: 'Production homepage v1', branch: 'main', files: ['index.html'], author: 'Mamun' },
      ],
      remoteCommits: [],
      remoteConnected: false,
      remoteUrl: '',
      sshReady: false,
      branches: ['main', 'feature/login'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Stand on main, then test Fast-Forward Merge, 3-Way Merge, or Cherry-Pick.'],
      highlightStage: 'local',
    },
    commands: [
      {
        id: 's12-ff',
        command: 'git merge feature/theme',
        label: 'Fast-Forward Merge',
        kind: 'do',
        routeLabel: 'Linear slide forward',
        effect: { type: 'merge_ff' },
      },
      {
        id: 's12-3way',
        command: 'git merge --no-ff feature/login',
        label: '3-Way Merge Commit',
        kind: 'do',
        routeLabel: 'Join two histories',
        effect: { type: 'merge_3way' },
      },
      {
        id: 's12-cp',
        command: 'git cherry-pick e7a11b2',
        label: 'Cherry-pick 1 commit',
        kind: 'do',
        routeLabel: 'Copy single snapshot',
        effect: { type: 'cherry_pick', arg: 'e7a11b2' },
      },
      {
        id: 's12-undo',
        command: 'git reset --hard HEAD~1',
        label: 'Undo last merge',
        kind: 'undo',
        routeLabel: 'Rewind Local Repo',
        effect: { type: 'reset_hard' },
      },
    ],
    vocabulary: [
      {
        term: 'Fast-Forward Merge',
        meaning: 'Simply moves the target branch pointer ahead when no new commits occurred on it.',
        analogy: 'No one touched the main room, so you declare your upgraded room the new main.',
      },
      {
        term: '3-Way Merge',
        meaning: 'Creates a new merge commit combining two diverged branches using their common ancestor.',
        analogy: 'Combining furniture added in two separate rooms into one unified room.',
      },
      {
        term: 'Cherry-Pick',
        meaning: 'Copies a single specific commit from another branch and applies it onto your current branch.',
        analogy: 'Carrying just one lamp from an experimental room back into the main room.',
      },
    ],
    flags: [
      {
        flag: '--no-ff',
        syntax: 'git merge --no-ff feature/login',
        purpose: 'Forces a merge commit even when fast-forward is possible, preserving feature history.',
        bestPractice: 'Loved by teams who want clear visual bubbles showing where each feature lived.',
      },
      {
        flag: '-i (rebase)',
        syntax: 'git rebase -i HEAD~3',
        purpose: 'Opens interactive editor to squash, reorder, or reword local commits cleanly.',
        bestPractice: 'Great for tidying messy WIP commits right before opening a Pull Request.',
      },
    ],
  },
  {
    stepNumber: 13,
    category: 'Remote & SSH',
    title: 'Cloud CCTV Backup — Remote & Push',
    subtitle: 'Connect your Local Repo to GitHub, set up SSH keys, and push commits',
    storyTitle: 'The CCTV Room Story — Chapter 13',
    storyText:
      'What if your laptop breaks or your room’s local DVR hard drive fails? You connect your local recorder to a secure Cloud Backup Vault — **GitHub (Remote Repo)**. You give the vault a nickname (`origin`), generate a cryptographic **SSH Key** for passwordless entry, and upload your snapshots with `git push -u origin main`.',
    theorySummary:
      '`git remote add origin <url>` saves a bookmark named `origin` pointing to your GitHub URL. Instead of typing credentials repeatedly, generate an SSH keypair with `ssh-keygen -t rsa -b 4096 -C "email"`, add it to `ssh-agent`, and paste `id_rsa.pub` into GitHub. Finally, `git push -u origin main` uploads commits from **Local Repo → Remote Repo**.',
    proTip:
      'The `-u` (`--set-upstream`) flag links your local `main` to `origin/main` once — after that, you only need to type short `git push` and `git pull`!',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'index.html', status: 'clean', detail: 'Committed locally' },
        { name: 'app.js', status: 'clean', detail: 'Committed locally' },
      ],
      staging: [],
      stash: [],
      localCommits: [
        { id: '9e1b7c4', message: 'Add responsive navigation', branch: 'main', files: ['index.html'], author: 'Mamun' },
        { id: '2b4d9a1', message: 'Initial project scaffold', branch: 'main', files: ['index.html', 'app.js'], author: 'Mamun' },
      ],
      remoteCommits: [],
      remoteConnected: false,
      remoteUrl: '',
      sshReady: false,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Link your GitHub Remote, set up SSH, then push Local Repo commits to the cloud!'],
      highlightStage: 'local',
    },
    commands: [
      {
        id: 's13-remote',
        command: 'git remote add origin git@github.com:dev/room.git',
        label: 'Connect GitHub remote',
        kind: 'do',
        routeLabel: 'Link Local → GitHub',
        effect: { type: 'remote_add' },
      },
      {
        id: 's13-ssh',
        command: 'ssh-keygen -t ed25519 -C "mamun@dev.io"',
        label: 'Generate SSH keypair',
        kind: 'do',
        routeLabel: 'Secure cloud auth',
        effect: { type: 'ssh_keygen' },
      },
      {
        id: 's13-push',
        command: 'git push -u origin main',
        label: 'Upload commits to GitHub',
        kind: 'do',
        routeLabel: 'Local Repo → Remote Repo',
        effect: { type: 'push_origin' },
      },
    ],
    vocabulary: [
      {
        term: 'Remote Repo (origin)',
        meaning: 'A hosted copy of your repository on a server like GitHub, GitLab, or Bitbucket.',
        analogy: 'Your off-site cloud backup vault mirroring your local CCTV hard drive.',
      },
      {
        term: 'SSH Keypair',
        meaning: 'A private key kept on your machine and a public key uploaded to GitHub for secure login.',
        analogy: 'A biometric vault keycard that opens GitHub without typing passwords.',
      },
    ],
    flags: [
      {
        flag: '-u',
        syntax: 'git push -u origin main',
        purpose: 'Sets upstream tracking so future pushes only require typing `git push`.',
        bestPractice: 'Use `-u` the very first time you push any newly created branch.',
      },
      {
        flag: '-v (remote)',
        syntax: 'git remote -v',
        purpose: 'Prints the fetch and push URLs attached to each remote alias.',
        bestPractice: 'Check this when verifying whether you are using HTTPS or SSH.',
      },
    ],
  },
  {
    stepNumber: 14,
    category: 'Remote & SSH',
    title: 'Syncing with Teammates — Clone, Fetch & Pull',
    subtitle: 'Understand the crucial difference between git fetch and git pull',
    storyTitle: 'The CCTV Room Story — Chapter 14',
    storyText:
      'Now a teammate uploads a new fix to the GitHub Cloud Vault! How do you bring it down? `git clone` copies an entire vault onto a brand-new laptop. `git fetch` downloads new cloud footage into your **Local Repo** only so you can inspect it safely first. `git pull` does both **Fetch + Merge**, bringing changes all the way into your **Workspace** immediately.',
    theorySummary:
      'Remember this golden distinction:\n• `git clone <url>` → Copies a remote repo (including `.git` history) into a new local folder.\n• `git fetch` → **Remote → Local Repo** (safe download; never touches your Workspace files).\n• `git pull` → **Remote → Local Repo → Workspace** (`git fetch` followed automatically by `git merge`).\n• **Fork** → Copies someone else’s GitHub repository into your own GitHub account so you can propose changes via Pull Requests.',
    proTip:
      'When working on an active team branch, run `git fetch` before merging if you want to preview incoming teammate changes with `git diff main origin/main`.',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'index.html', status: 'clean', detail: '1 commit behind GitHub' },
        { name: 'app.js', status: 'clean', detail: '1 commit behind GitHub' },
      ],
      staging: [],
      stash: [],
      localCommits: [
        { id: '2b4d9a1', message: 'Initial project scaffold', branch: 'main', files: ['index.html', 'app.js'], author: 'Mamun' },
      ],
      remoteCommits: [
        { id: '7a3d9f0', message: 'Teammate: Fix API timeout bug', branch: 'origin/main', files: ['api-fix.js'], author: 'Sara' },
        { id: '2b4d9a1', message: 'Initial project scaffold', branch: 'origin/main', files: ['index.html', 'app.js'], author: 'Mamun' },
      ],
      remoteConnected: true,
      remoteUrl: 'git@github.com:mamun/room-project.git',
      sshReady: true,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # GitHub has a new commit (7a3d9f0) from Sara. Compare git fetch vs git pull!'],
      highlightStage: 'remote',
    },
    commands: [
      {
        id: 's14-fetch',
        command: 'git fetch origin',
        label: 'Fetch (Remote → Local only)',
        kind: 'do',
        routeLabel: 'Remote → Local Repo',
        effect: { type: 'fetch_origin' },
      },
      {
        id: 's14-pull',
        command: 'git pull origin main',
        label: 'Pull (Remote → Workspace)',
        kind: 'do',
        routeLabel: 'Remote → Workspace',
        effect: { type: 'pull_origin' },
      },
      {
        id: 's14-clone',
        command: 'git clone git@github.com:dev/room.git',
        label: 'Simulate fresh git clone',
        kind: 'inspect',
        routeLabel: 'Full Remote Copy',
        effect: { type: 'clone_repo' },
      },
    ],
    vocabulary: [
      {
        term: 'git fetch',
        meaning: 'Downloads commits, files, and refs from a remote into your Local Repo without merging.',
        analogy: 'Downloading cloud footage onto your DVR hard drive without changing your physical desk.',
      },
      {
        term: 'git pull',
        meaning: 'Shorthand that runs `git fetch` and immediately merges the changes into your active Workspace.',
        analogy: 'Downloading cloud footage and immediately applying those room updates to your desk.',
      },
      {
        term: 'Fork',
        meaning: 'A server-side copy of another user’s repository inside your own GitHub account.',
        analogy: 'Copying a public blueprint into your own cloud vault so you can customize it freely.',
      },
    ],
    flags: [
      {
        flag: '<folder_name>',
        syntax: 'git clone <url> my-app',
        purpose: 'Clones the repository into a custom folder name instead of the default repo name.',
        bestPractice: 'Handy when keeping two checkouts of the same project side-by-side.',
      },
      {
        flag: '--rebase',
        syntax: 'git pull --rebase',
        purpose: 'Replays your local unpushed commits cleanly on top of incoming remote commits.',
        bestPractice: 'Prevents noisy automatic "Merge branch main of origin" commits.',
      },
    ],
  },
  {
    stepNumber: 15,
    category: 'Undo & Recovery',
    title: 'Safe Undo on Shared History — git revert',
    subtitle: 'Reverse a pushed commit cleanly without breaking teammates’ repositories',
    storyTitle: 'The CCTV Room Story — Chapter 15',
    storyText:
      'You already uploaded a buggy snapshot to the shared GitHub Cloud Vault, and three teammates have downloaded it. If you secretly erase that tape using `git reset` and force-push, everyone else’s timeline shatters! Instead, `git revert HEAD` records a brand-new **corrective snapshot** that neatly cancels the bug while keeping the honest audit trail intact.',
    theorySummary:
      '**Important Rule**: `git reset` alone does NOT undo a pushed commit on GitHub. Rewriting published history requires `git push --force-with-lease`, which should be avoided on shared branches like `main`. Always prefer `git revert HEAD` on shared repositories: it creates a new inverse commit that can be pushed normally with `git push`.',
    proTip:
      'With all 4 stages mastered solo, the final 4 chapters show how real engineering teams collaborate daily: feature branches, knowing exactly when to `git pull`, Pull Request code reviews, and contributing to Open Source via Forks & `upstream`.',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'index.html', status: 'clean', detail: 'Clean' },
        { name: 'pricing.js', status: 'clean', detail: 'Contains pushed bug' },
      ],
      staging: [],
      stash: [],
      localCommits: [
        { id: 'd4b88e1', message: 'Broken discount formula (pushed!)', branch: 'main', files: ['pricing.js'], author: 'Mamun' },
        { id: '7a3d9f0', message: 'Fix API timeout bug', branch: 'main', files: ['api-fix.js'], author: 'Sara' },
      ],
      remoteCommits: [
        { id: 'd4b88e1', message: 'Broken discount formula (pushed!)', branch: 'origin/main', files: ['pricing.js'], author: 'Mamun' },
        { id: '7a3d9f0', message: 'Fix API timeout bug', branch: 'origin/main', files: ['api-fix.js'], author: 'Sara' },
      ],
      remoteConnected: true,
      remoteUrl: 'git@github.com:mamun/room-project.git',
      sshReady: true,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Commit d4b88e1 is already on GitHub! Safely undo it with git revert HEAD, then push.'],
      highlightStage: 'remote',
    },
    commands: [
      {
        id: 's15-revert',
        command: 'git revert HEAD',
        label: 'Create safe inverse commit',
        kind: 'undo',
        routeLabel: 'Safe Shared Undo',
        effect: { type: 'revert_head' },
      },
      {
        id: 's15-push',
        command: 'git push origin main',
        label: 'Push corrective snapshot',
        kind: 'do',
        routeLabel: 'Local Repo → Remote Repo',
        effect: { type: 'push_revert' },
      },
    ],
    vocabulary: [
      {
        term: 'git revert',
        meaning: 'Creates a brand-new commit whose changes are the exact opposite of a specified past commit.',
        analogy: 'Filing an official correction memo on top of a public ledger instead of tearing out a page.',
      },
      {
        term: '--force-with-lease',
        meaning: 'A safer force-push that refuses to overwrite GitHub if a teammate pushed newer commits.',
        analogy: 'Checking nobody entered the vault since you last looked before replacing your personal draft.',
      },
    ],
    flags: [
      {
        flag: 'HEAD',
        syntax: 'git revert HEAD',
        purpose: 'Reverses the latest commit safely by adding a new inverse commit.',
        bestPractice: 'Gold standard for undoing mistakes on `main` or any shared team branch.',
      },
      {
        flag: '--no-commit (-n)',
        syntax: 'git revert -n <commit-id>',
        purpose: 'Applies the reverse patch into your Staging/Workspace without committing yet.',
        bestPractice: 'Useful when reverting multiple commits together into a single clean revert.',
      },
      {
        flag: '--force-with-lease',
        syntax: 'git push --force-with-lease',
        purpose: 'Updates a personal feature branch after rebase/reset without clobbering teammates.',
        bestPractice: 'Always prefer `--force-with-lease` over raw `--force` (`-f`) on solo feature branches.',
      },
    ],
  },
  {
    stepNumber: 17,
    category: 'Team Collaboration',
    title: 'Team Feature Workflow & When to git pull',
    subtitle: 'Best-practice daily cycle for teammates: pull main first, branch cleanly, commit small, and push feature branches',
    storyTitle: 'The CCTV Room Story — Chapter 16 (Team Studio Rules)',
    storyText:
      'Now you are building an app with teammates Sara and Alex. If everyone edits directly inside the `main` showroom at once, people constantly overwrite each other’s work! Instead, every teammate follows a golden rhythm: **pull the latest `main` first**, spin off a private feature room (`git switch -c feat/search`), build in small clean commits, and push only your feature branch.',
    theorySummary:
      '• **The Golden Feature-Branch Rule**: Treat `main` as sacred, always-deployable code. Never commit directly to `main` on a team project.\n• **The 4 Exact Moments to Run `git pull`**:\n  1. **Before starting any new feature**: `git switch main` → `git pull origin main` → `git switch -c feat/my-task` (prevents starting on stale code).\n  2. **Mid-feature on long tasks (daily sync)**: `git fetch origin` then `git merge origin/main` (or `git rebase origin/main`) so you catch tiny merge conflicts early instead of a giant conflict days later.\n  3. **Right before opening a Pull Request**: Sync with latest `main` and re-run tests so reviewers see a green, conflict-free diff.\n  4. **Right after your PR is merged**: `git switch main` → `git pull` → `git branch -d feat/my-task` to clean up.\n• **Small, Atomic Commits**: Keep each feature branch focused on **one** ticket/task (under ~300 lines when possible) so teammates can review it in minutes.',
    proTip:
      'Run `git pull --rebase` when pulling onto a clean branch — it replays any unpushed local commits neatly on top of your teammates’ changes without cluttering the log with automatic merge bubbles.',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'index.html', status: 'clean', detail: 'Clean local main' },
        { name: 'app.js', status: 'clean', detail: '1 commit behind GitHub' },
      ],
      staging: [],
      stash: [],
      localCommits: [
        { id: '2a1c4f0', message: 'Base app layout', branch: 'main', files: ['index.html'], author: 'Mamun' },
      ],
      remoteCommits: [
        { id: '8f3e2b9', message: 'Add navbar auth state (Sara)', branch: 'origin/main', files: ['api-fix.js'], author: 'Sara' },
        { id: '2a1c4f0', message: 'Base app layout', branch: 'origin/main', files: ['index.html'], author: 'Mamun' },
      ],
      remoteConnected: true,
      remoteUrl: 'git@github.com:team/app.git',
      sshReady: true,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Teammate Sara just merged 8f3e2b9 to origin/main! Pull first, then branch for your new feature.'],
      highlightStage: 'remote',
    },
    commands: [
      {
        id: 's17-pull',
        command: 'git pull origin main',
        label: '1. Pull teammate updates first',
        kind: 'do',
        routeLabel: 'Remote → Local + Workspace',
        effect: { type: 'pull_origin' },
      },
      {
        id: 's17-branch',
        command: 'git switch -c feat/search',
        label: '2. Cut fresh feature branch',
        kind: 'do',
        routeLabel: 'New branch off main',
        effect: { type: 'branch_create', arg: 'feat/search' },
      },
      {
        id: 's17-commit',
        command: 'git commit -m "Add live search bar"',
        label: '3. Commit focused feature work',
        kind: 'do',
        routeLabel: 'Staging → Local (feat/search)',
        effect: { type: 'branch_commit', arg: 'Add live search bar' },
      },
      {
        id: 's17-push',
        command: 'git push -u origin feat/search',
        label: '4. Push feature branch safely',
        kind: 'do',
        routeLabel: 'Local → Remote (feat/search)',
        effect: { type: 'push_feature', arg: 'feat/search' },
      },
    ],
    vocabulary: [
      {
        term: 'Feature Branch Workflow',
        meaning: 'Every new feature or bug fix is developed in its own short-lived branch cut from up-to-date `main`.',
        analogy: 'Working in a separate side studio before bringing finished artwork into the main gallery.',
      },
      {
        term: 'Branch Naming Convention',
        meaning: 'Prefixing branches clearly like `feat/search`, `fix/login-bug`, `docs/readme`, or `chore/deps`.',
        analogy: 'Labeling each side room door so teammates instantly know what is being built inside.',
      },
      {
        term: 'Atomic Commit',
        meaning: 'A single focused commit that does one logical thing and leaves the app building cleanly.',
        analogy: 'Taking one crisp photo per milestone instead of waiting until the whole room is torn apart.',
      },
    ],
    flags: [
      {
        flag: 'switch -c',
        syntax: 'git switch -c feat/search',
        purpose: 'Modern, crystal-clear command to create and immediately switch to a new branch.',
        bestPractice: 'Always run `git pull origin main` right before `git switch -c`.',
      },
      {
        flag: '-u (push)',
        syntax: 'git push -u origin feat/search',
        purpose: 'Publishes your feature branch to GitHub and links tracking so future pushes are just `git push`.',
        bestPractice: 'Use `-u` the first time you push any newly created branch.',
      },
      {
        flag: '--rebase (pull)',
        syntax: 'git pull --rebase origin main',
        purpose: 'Fetches remote commits and replays your local commits cleanly on top.',
        bestPractice: 'Keeps team history linear and avoids noisy auto-merge commits.',
      },
    ],
  },
  {
    stepNumber: 18,
    category: 'Team Collaboration',
    title: 'Pull Request (PR) Flow & Code Review',
    subtitle: 'Open a Pull Request, address reviewer feedback with follow-up commits, squash-merge, and delete stale branches',
    storyTitle: 'The CCTV Room Story — Chapter 17 (The Inspection Gate)',
    storyText:
      'Your feature room (`feat/search`) is uploaded to the Cloud Vault, yet it has NOT entered `main` yet! On GitHub, you open a **Pull Request (PR)** — an official invitation asking teammates: *"Please inspect my diff and pull `feat/search` into `main`."* Reviewers leave line-by-line suggestions, automated tests run, and every new `git push` to your branch updates the exact same PR automatically!',
    theorySummary:
      '• **What is a Pull Request (PR)?** A GitHub collaboration gate (called a *Merge Request* on GitLab) showing the exact diff between your **head branch** (`feat/search`) and the **base branch** (`main`), paired with discussion threads, approvals, and CI checks.\n• **How PR Feedback Works (Zero Need to Open a New PR!)**: When a reviewer requests a change, stay on your same branch (`feat/search`), make the fix, `git commit`, and run `git push`. GitHub automatically appends the new commit to the open PR!\n• **3 Merge Button Options on GitHub**:\n  1. **Squash and Merge** *(Most popular for teams)*: Combines messy WIP commits (`"wip"`, `"fix typo"`) into **1 clean commit** on `main`.\n  2. **Create a Merge Commit**: Preserves every individual branch commit plus a merge bubble.\n  3. **Rebase and Merge**: Replays every individual commit linearly onto `main`.\n• **Post-Merge Cleanup**: Delete the merged branch on GitHub and locally (`git branch -d feat/search`) so branches never pile up.',
    proTip:
      'Write a great PR description with **What changed**, **Why**, and a **Screenshot / How to test** checklist — reviewers approve clear PRs 3× faster!',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'index.html', status: 'clean', detail: 'Clean' },
        { name: 'search.tsx', status: 'modified', detail: 'New feature ready for PR' },
      ],
      staging: [
        { name: 'search.tsx', status: 'staged', detail: 'Ready for review fix' },
      ],
      stash: [],
      localCommits: [
        { id: 'f6c21a4', message: 'Add live search bar', branch: 'feat/search', files: ['search.tsx'], author: 'Mamun' },
        { id: '8f3e2b9', message: 'Add navbar auth state (Sara)', branch: 'main', files: ['api-fix.js'], author: 'Sara' },
      ],
      remoteCommits: [
        { id: '8f3e2b9', message: 'Add navbar auth state (Sara)', branch: 'origin/main', files: ['api-fix.js'], author: 'Sara' },
      ],
      remoteConnected: true,
      remoteUrl: 'git@github.com:team/app.git',
      sshReady: true,
      branches: ['main', 'feat/search'],
      currentBranch: 'feat/search',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Walk through the complete Pull Request lifecycle from push → review fix → squash merge!'],
      highlightStage: 'local',
    },
    commands: [
      {
        id: 's18-open',
        command: 'git push -u origin feat/search',
        label: '1. Push & open PR #42',
        kind: 'do',
        routeLabel: 'Local → GitHub PR #42',
        effect: { type: 'open_pr', arg: 'feat/search' },
      },
      {
        id: 's18-fix',
        command: 'git commit -m "Address PR review: debounce"',
        label: '2. Commit reviewer fix',
        kind: 'do',
        routeLabel: 'Staging → Local (feat/search)',
        effect: { type: 'pr_review_fix' },
      },
      {
        id: 's18-push2',
        command: 'git push',
        label: '3. Auto-update open PR #42',
        kind: 'do',
        routeLabel: 'Local → Update PR #42',
        effect: { type: 'push_pr_update' },
      },
      {
        id: 's18-merge',
        command: 'gh pr merge 42 --squash --delete-branch',
        label: '4. Squash merge & clean branch',
        kind: 'do',
        routeLabel: 'PR #42 → main (cleanup)',
        effect: { type: 'pr_merge_cleanup' },
      },
    ],
    vocabulary: [
      {
        term: 'Pull Request (PR)',
        meaning: 'A GitHub request proposing to merge changes from a feature branch (head) into a target branch (base) after review.',
        analogy: 'Submitting your side-room work at the Inspection Gate for teammates to approve before moving it to the main showroom.',
      },
      {
        term: 'Draft PR',
        meaning: 'A work-in-progress Pull Request marked not ready for merge yet, used to get early design feedback or trigger CI.',
        analogy: 'Putting a "Feedback Welcome — Still Painting" sign on your inspection request.',
      },
      {
        term: 'Squash & Merge',
        meaning: 'Combines all commits from a PR branch into a single neat commit on `main`.',
        analogy: 'Summarizing 6 rough progress snapshots into 1 polished finished milestone photo.',
      },
      {
        term: 'Branch Protection Rules',
        meaning: 'GitHub rules blocking direct pushes to `main` and requiring PR approvals + passing CI tests before merging.',
        analogy: 'Locking the main showroom door so changes can only enter through the Inspection Gate.',
      },
    ],
    flags: [
      {
        flag: 'Draft PR',
        syntax: 'gh pr create --draft',
        purpose: 'Opens a work-in-progress PR early to share progress and run automated tests.',
        bestPractice: 'Use Draft PRs for big features so teammates spot architecture issues early.',
      },
      {
        flag: '--squash',
        syntax: 'gh pr merge --squash --delete-branch',
        purpose: 'Merges a PR as one clean commit and deletes the feature branch automatically.',
        bestPractice: 'Best default for keeping `main` history readable and clean.',
      },
      {
        flag: 'Fixes #123',
        syntax: 'In PR body: "Closes #123"',
        purpose: 'Automatically closes the linked GitHub Issue the moment your PR is merged.',
        bestPractice: 'Always link the ticket/issue number inside your PR description.',
      },
    ],
  },
  {
    stepNumber: 19,
    category: 'Open Source',
    title: 'Open-Source Contribution — Fork, Branch & PR',
    subtitle: 'Contribute to public repos you don’t own using Fork → Clone → Add upstream → Feature Branch → Cross-Repo PR',
    storyTitle: 'The CCTV Room Story — Chapter 18 (Contributing to Open Source)',
    storyText:
      'You discover an accessibility bug in a popular open-source library (`awesome-org/ui-kit`). Because you are not a maintainer, GitHub blocks you from running `git push` directly to `awesome-org/ui-kit`. Instead, you click **Fork** on GitHub to create your own personal cloud copy (`mamun/ui-kit`), clone YOUR fork (`origin`), link the original project as `upstream`, create a fix branch, push to your fork, and open a **Cross-Repo Pull Request** back to `awesome-org/ui-kit`!',
    theorySummary:
      '• **Why Fork Instead of Direct Clone?** A direct clone of someone else’s public repo gives you read-only access (you’ll get `Permission denied` on push). **Forking** makes a server-side copy under *your* GitHub account where you have full push permissions.\n• **The 2 Remotes Every Open-Source Contributor Sets**:\n  - **`origin`** → YOUR fork (`github.com/your-name/repo.git`) — where you **push** your branches.\n  - **`upstream`** → THE ORIGINAL repo (`github.com/original-org/repo.git`) — where you **fetch/pull** official updates.\n• **Open-Source Best Practices**:\n  1. Read `CONTRIBUTING.md` and check open Issues first (ask before building huge features).\n  2. **Never commit to `main` on your fork!** Always create a dedicated branch (`git switch -c fix/button-aria`) so your `main` stays a pure mirror of `upstream/main`.\n  3. Run tests/lint locally, push to `origin`, and open a PR from `your-name:fix/button-aria` → `awesome-org:main`.',
    proTip:
      'Keep your fork’s `main` branch 100% untouched (never make direct commits on it). That way, syncing with `upstream/main` later is ALWAYS a painless fast-forward with zero conflicts!',
    initialState: {
      initialized: false,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [],
      staging: [],
      stash: [],
      localCommits: [],
      remoteCommits: [
        { id: '3b2c9a0', message: 'v2.4.0 Release (forked from upstream)', branch: 'origin/main', files: ['Button.tsx', 'README.md'], author: 'Maintainer' },
      ],
      remoteConnected: false,
      remoteUrl: 'git@github.com:mamun/ui-kit.git',
      sshReady: true,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Step 0 done on GitHub: Clicked "Fork" on awesome-org/ui-kit -> mamun/ui-kit. Now clone YOUR fork!'],
      highlightStage: 'remote',
    },
    commands: [
      {
        id: 's19-clone',
        command: 'git clone git@github.com:mamun/ui-kit.git',
        label: '1. Clone YOUR fork (origin)',
        kind: 'do',
        routeLabel: 'Your Fork → Local + Workspace',
        effect: { type: 'fork_clone' },
      },
      {
        id: 's19-upstream',
        command: 'git remote add upstream git@github.com:awesome-org/ui-kit.git',
        label: '2. Link original repo (upstream)',
        kind: 'do',
        routeLabel: 'Register upstream URL',
        effect: { type: 'upstream_add' },
      },
      {
        id: 's19-branch',
        command: 'git switch -c fix/button-aria',
        label: '3. Branch off clean main',
        kind: 'do',
        routeLabel: 'Create fix branch',
        effect: { type: 'branch_create', arg: 'fix/button-aria' },
      },
      {
        id: 's19-push',
        command: 'git push -u origin fix/button-aria',
        label: '4. Push fix & open upstream PR',
        kind: 'do',
        routeLabel: 'Local → Your Fork (for PR)',
        effect: { type: 'push_fork_pr', arg: 'fix/button-aria' },
      },
    ],
    vocabulary: [
      {
        term: 'Fork',
        meaning: 'A personal copy of another organization’s GitHub repository under your own account so you can push branches freely.',
        analogy: 'Cloning the public museum blueprint into your own private studio vault so you can propose improvements.',
      },
      {
        term: 'origin vs upstream',
        meaning: '`origin` points to YOUR fork on GitHub (read/write); `upstream` points to the ORIGINAL project repository (read-only).',
        analogy: '`origin` is your personal cloud locker; `upstream` is the official headquarters master vault.',
      },
      {
        term: 'Cross-Repository PR',
        meaning: 'A Pull Request proposing to merge a branch from YOUR fork (`mamun:fix/button-aria`) into the original repo (`awesome-org:main`).',
        analogy: 'Mailing a finished patch from your studio back to headquarters for inclusion in the official release.',
      },
    ],
    flags: [
      {
        flag: 'remote add upstream',
        syntax: 'git remote add upstream <original-url>',
        purpose: 'Saves the original open-source repository URL under the standard alias `upstream`.',
        bestPractice: 'Run immediately after cloning your fork so syncing later is effortless.',
      },
      {
        flag: 'remote -v',
        syntax: 'git remote -v',
        purpose: 'Lists all configured remote aliases (`origin` and `upstream`) with their fetch/push URLs.',
        bestPractice: 'Check this if you ever aren’t sure whether you’re pushing to your fork or upstream.',
      },
      {
        flag: 'CONTRIBUTING.md',
        syntax: 'Check repo root before coding',
        purpose: 'Documents code style, commit message rules, test commands, and PR guidelines.',
        bestPractice: 'Reading `CONTRIBUTING.md` first prevents your PR from being rejected on style rules.',
      },
    ],
  },
  {
    stepNumber: 20,
    category: 'Open Source',
    title: 'Keeping Your Fork Updated with upstream',
    subtitle: 'Sync your stale fork with the original repository using fetch upstream → merge → push origin (or Sync Fork)',
    storyTitle: 'The CCTV Room Story — Chapter 19 (Finale: Syncing Your Fork)',
    storyText:
      'Two weeks after your first open-source contribution, the maintainers of `awesome-org/ui-kit` merged 20 new commits. Your GitHub fork (`mamun/ui-kit`) does **NOT** update automatically — it is now behind! Before starting your next contribution, you pull fresh blueprints from `upstream`, fast-forward your local `main`, and push them up to `origin` so both your PC and your fork are 100% current.',
    theorySummary:
      '• **Why Forks Fall Behind**: A GitHub Fork is a snapshot taken at the moment you clicked Fork. New commits added to `awesome-org/ui-kit` never auto-sync into your fork unless you trigger a sync.\n• **The 3-Step CLI Sync Recipe** (from your `main` branch):\n  1. `git fetch upstream` — Downloads all new commits from the original project into `upstream/main`.\n  2. `git merge upstream/main` — Fast-forwards your local `main` branch (and Workspace) cleanly with zero conflicts because you kept `main` clean!\n  3. `git push origin main` — Pushes those fresh commits up to YOUR GitHub fork so your cloud copy matches `upstream` too.\n• **What if you already have an open feature branch?** Sync `main` first, then run `git switch fix/my-pr` and `git rebase main` (or `git merge main`), followed by `git push --force-with-lease` if you rebased.\n• **GitHub Web Shortcut**: You can also click **"Sync fork → Update branch"** on your fork’s GitHub page, then simply run `git pull origin main` on your laptop!',
    proTip:
      'Congratulations on reaching 100%! You now master Git from `git init` all the way to Team Pull Requests and Open-Source Fork Syncing. Use the Branch Lab, Flow Matrix, and Cheat Sheet anytime — or click **Download Offline HTML** to keep this complete 20-step studio offline forever.',
    initialState: {
      initialized: true,
      config: { name: 'Mamun', email: 'mamun@dev.io', autocrlf: 'true' },
      workspace: [
        { name: 'Button.tsx', status: 'clean', detail: '2 commits behind upstream' },
        { name: 'README.md', status: 'clean', detail: '2 commits behind upstream' },
      ],
      staging: [],
      stash: [],
      localCommits: [
        { id: '3b2c9a0', message: 'v2.4.0 Release (your fork is behind)', branch: 'main', files: ['Button.tsx'], author: 'Maintainer' },
      ],
      remoteCommits: [
        { id: '3b2c9a0', message: 'v2.4.0 Release (origin/main is behind)', branch: 'origin/main', files: ['Button.tsx'], author: 'Maintainer' },
      ],
      remoteConnected: true,
      remoteUrl: 'git@github.com:mamun/ui-kit.git',
      sshReady: true,
      branches: ['main'],
      currentBranch: 'main',
      headDetachedAt: null,
      activeFlow: null,
      terminalLines: ['$ # Original repo (upstream) has 2 new commits! Sync Local main & YOUR fork in 3 steps.'],
      highlightStage: 'remote',
    },
    commands: [
      {
        id: 's20-remotes',
        command: 'git remote -v',
        label: '1. Verify origin & upstream',
        kind: 'inspect',
        routeLabel: 'Inspect remotes',
        effect: { type: 'remote_list_upstream' },
      },
      {
        id: 's20-fetch',
        command: 'git fetch upstream',
        label: '2. Fetch original repo updates',
        kind: 'do',
        routeLabel: 'upstream → Local Repo',
        effect: { type: 'upstream_fetch' },
      },
      {
        id: 's20-merge',
        command: 'git merge upstream/main',
        label: '3. Fast-forward local main',
        kind: 'do',
        routeLabel: 'Local → Workspace',
        effect: { type: 'upstream_merge' },
      },
      {
        id: 's20-push',
        command: 'git push origin main',
        label: '4. Update YOUR GitHub fork',
        kind: 'do',
        routeLabel: 'Local → origin (Your Fork)',
        effect: { type: 'upstream_push_origin' },
      },
    ],
    vocabulary: [
      {
        term: 'upstream/main',
        meaning: 'Your local read-only tracking bookmark showing the latest commit fetched from the original project’s `main` branch.',
        analogy: 'The official news ticker from headquarters saved on your DVR.',
      },
      {
        term: 'Sync Fork (GitHub UI)',
        meaning: 'A one-click button on your GitHub fork page that updates `origin/main` from `upstream/main` directly in the cloud.',
        analogy: 'Asking the cloud vault to copy headquarters’ latest master tape straight into your locker.',
      },
      {
        term: 'Rebasing a Stale PR Branch',
        meaning: 'Running `git rebase main` on your feature branch after syncing `main` so your PR applies cleanly to the newest code.',
        analogy: 'Lifting your side-room drawing onto the freshly updated blueprint before inspection.',
      },
    ],
    flags: [
      {
        flag: 'fetch upstream',
        syntax: 'git fetch upstream',
        purpose: 'Downloads new commits and tags from the original repository without changing your working files.',
        bestPractice: 'Always fetch `upstream` before creating a new open-source PR branch.',
      },
      {
        flag: 'merge upstream/main',
        syntax: 'git switch main && git merge upstream/main',
        purpose: 'Fast-forwards your local `main` branch to match the original project.',
        bestPractice: 'Works conflict-free as long as you never commit directly to your fork’s `main`.',
      },
      {
        flag: 'push origin main',
        syntax: 'git push origin main',
        purpose: 'Updates your personal GitHub fork so its `main` branch matches `upstream/main`.',
        bestPractice: 'Always finish the sync by pushing to `origin` so your GitHub fork stays fresh.',
      },
    ],
  },
];

export const LESSONS: LessonStep[] = RAW_LESSONS.map((lesson, idx) => ({
  ...lesson,
  stepNumber: idx + 1,
}));

