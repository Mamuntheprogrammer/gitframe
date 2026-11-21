export type StageId = 'workspace' | 'staging' | 'local' | 'remote';

export type FileStatus =
  | 'untracked'
  | 'modified'
  | 'staged'
  | 'clean'
  | 'deleted'
  | 'ignored'
  | 'renamed';

export interface FileEntry {
  name: string;
  status: FileStatus;
  detail?: string;
}

export interface CommitNode {
  id: string;
  message: string;
  branch: string;
  files: string[];
  author: string;
  isMerge?: boolean;
  isRevert?: boolean;
}

export interface FlowSignal {
  from: StageId;
  to: StageId;
  direction: 'forward' | 'backward' | 'inspect' | 'local';
  command: string;
  label: string;
}

export interface RepoState {
  initialized: boolean;
  config: {
    name: string;
    email: string;
    autocrlf: string;
  };
  workspace: FileEntry[];
  staging: FileEntry[];
  stash: string[];
  localCommits: CommitNode[];
  remoteCommits: CommitNode[];
  remoteConnected: boolean;
  remoteUrl: string;
  sshReady: boolean;
  branches: string[];
  currentBranch: string;
  headDetachedAt: string | null;
  activeFlow: FlowSignal | null;
  terminalLines: string[];
  highlightStage: StageId | null;
}

export interface VocabularyItem {
  term: string;
  meaning: string;
  analogy: string;
}

export interface FlagItem {
  flag: string;
  syntax: string;
  purpose: string;
  bestPractice: string;
}

export interface CommandEffect {
  type:
    | 'intro_git'
    | 'intro_github'
    | 'intro_sync'
    | 'version'
    | 'init'
    | 'uninit'
    | 'config_set'
    | 'config_list'
    | 'status'
    | 'status_short'
    | 'add_file'
    | 'add_all'
    | 'add_star'
    | 'ls_files'
    | 'commit'
    | 'commit_am'
    | 'commit_amend'
    | 'diff_workspace'
    | 'diff_staged'
    | 'show_commit'
    | 'log_full'
    | 'log_oneline'
    | 'log_stat'
    | 'restore_staged'
    | 'restore_workspace'
    | 'clean_preview'
    | 'clean_force'
    | 'reset_soft'
    | 'reset_mixed'
    | 'reset_hard'
    | 'rm_file'
    | 'rm_cached'
    | 'mv_file'
    | 'create_gitignore'
    | 'stash_push'
    | 'stash_list'
    | 'stash_pop'
    | 'branch_create'
    | 'branch_switch'
    | 'branch_commit'
    | 'branch_delete'
    | 'merge_ff'
    | 'merge_3way'
    | 'cherry_pick'
    | 'remote_add'
    | 'ssh_keygen'
    | 'push_origin'
    | 'clone_repo'
    | 'fetch_origin'
    | 'pull_origin'
    | 'revert_head'
    | 'push_revert'
    | 'checkout_past'
    | 'checkout_main'
    | 'push_feature'
    | 'open_pr'
    | 'pr_review_fix'
    | 'push_pr_update'
    | 'pr_merge_cleanup'
    | 'fork_clone'
    | 'upstream_add'
    | 'push_fork_pr'
    | 'remote_list_upstream'
    | 'upstream_fetch'
    | 'upstream_merge'
    | 'upstream_push_origin';
  arg?: string;
  arg2?: string;
}

export interface GitCommandAction {
  id: string;
  command: string;
  label: string;
  kind: 'do' | 'undo' | 'inspect';
  routeLabel: string;
  effect: CommandEffect;
}

export type LanguageMode = 'en' | 'bn';

export interface LessonBnContent {
  storyTitle: string;
  storyText: string;
  theorySummary: string;
  proTip: string;
}

export interface LessonStep {
  stepNumber: number;
  category: string;
  title: string;
  subtitle: string;
  storyTitle: string;
  storyText: string;
  theorySummary: string;
  proTip: string;
  initialState: RepoState;
  commands: GitCommandAction[];
  vocabulary: VocabularyItem[];
  flags: FlagItem[];
}

export interface StageFlowRow {
  id: string;
  direction: 'forward' | 'backward';
  from: StageId;
  to: StageId;
  fromLabel: string;
  toLabel: string;
  command: string;
  purpose: string;
  safety: 'Safe' | 'Caution' | 'Destructive';
}

export interface CheatSheetItem {
  command: string;
  shorthand?: string;
  description: string;
  category:
    | 'Setup'
    | 'Daily Workflow'
    | 'Inspect & Diff'
    | 'Undo & Recovery'
    | 'Branch & Merge'
    | 'Remote & SSH'
    | 'Stash & Clean';
}
