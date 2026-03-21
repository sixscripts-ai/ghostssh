---
name: ssh-mac-dev
description: >
  Connect to the user's Mac via SSH through a reverse tunnel and act as a full
  development partner — running terminal commands, creating and editing code files,
  managing Git repos, and installing dependencies. Use this skill any time the user
  mentions connecting to their Mac, controlling their terminal remotely, SSHing into
  their computer, developing a repo on their machine, or asks Claude to run commands
  on their local machine. Trigger even for casual mentions like "can you work on my
  Mac", "run this on my computer", or "let's code on my machine".
---

# SSH Mac Dev Skill

Claude connects to the user's Mac over SSH via a reverse tunnel and acts as a
hands-on development partner with full terminal access.

---

## How the connection works

The user runs a **bore tunnel** on their Mac. This punches a hole through their
router/firewall and gives Claude a public hostname + port to SSH into. Claude
then SSHes from its bash_tool container into the Mac.

No router config. No static IP. No accounts needed (bore.pub is free).

---

## Step 1 — First-time Mac setup (one-time only)

Tell the user to do these steps once on their Mac if they haven't already.

### 1a. Enable SSH on the Mac
```
System Settings → General → Sharing → turn on "Remote Login"
```
Or via terminal:
```bash
sudo systemsetup -setremotelogin on
```

### 1b. Install bore
```bash
curl -L https://github.com/ekzhang/bore/releases/latest/download/bore-v0.5.0-x86_64-apple-darwin.tar.gz | tar xz
sudo mv bore /usr/local/bin/
```

### 1c. Note their Mac username
```bash
whoami
```
Ask the user to share the output — Claude needs it to SSH in.

---

## Step 2 — Starting a session (every time)

Ask the user to run this in their Mac terminal:
```bash
bore local 22 --to bore.pub
```

It will print something like:
```
listening at bore.pub:XXXXX
```

Ask them to paste the **port number** (the XXXXX) into the chat.

---

## Step 3 — Claude connects

Once Claude has:
- The bore port (e.g. `43210`)
- The user's Mac username (e.g. `alex`)

SSH in from bash_tool:
```bash
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -p <PORT> <USERNAME>@bore.pub "<command>"
```

**Run a quick test first:**
```bash
ssh -o StrictHostKeyChecking=no -p <PORT> <USERNAME>@bore.pub "echo connected && whoami && pwd"
```

If this fails, see the Troubleshooting section below.

---

## Working on the Mac

Once connected, run all work through ssh one-liners or heredocs. Keep commands
focused — don't try to run interactive sessions.

### Running commands
```bash
ssh -o StrictHostKeyChecking=no -p <PORT> <USERNAME>@bore.pub "cd ~/my-project && npm test"
```

### Reading a file
```bash
ssh -o StrictHostKeyChecking=no -p <PORT> <USERNAME>@bore.pub "cat ~/my-project/src/index.js"
```

### Writing / editing a file
Use heredoc to write files cleanly:
```bash
ssh -o StrictHostKeyChecking=no -p <PORT> <USERNAME>@bore.pub "cat > ~/my-project/src/index.js" << 'EOF'
// your file content here
EOF
```

### Git operations

See the full Git Workflow section below for detailed patterns.

### Installing dependencies
```bash
# Node
ssh ... "cd ~/my-project && npm install"
# Python
ssh ... "cd ~/my-project && pip install -r requirements.txt"
# Homebrew
ssh ... "brew install <package>"
```

### Cloning a new repo
```bash
ssh ... "cd ~ && git clone https://github.com/user/repo.git && cd repo && ls"
```

---

## Keeping the connection alive across multiple commands

Store connection details as shell variables at the top of bash_tool calls:
```bash
PORT=43210
USER=alex
SSH="ssh -o StrictHostKeyChecking=no -p $PORT $USER@bore.pub"
$SSH "echo test"
```

---

---

## SSH Auth — auto-detect

When the user says "not sure" about auth, probe both methods:

**Step 1 — try key auth first (no password needed):**
```bash
ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=8 \
  -p <PORT> <USERNAME>@bore.pub "echo key-auth-ok"
```

- If it prints `key-auth-ok` → key auth works, proceed normally
- If it fails with `Permission denied` → fall back to password auth

**Step 2 — if key auth fails, ask the user:**
> "Looks like your Mac needs a password to SSH in. What's the password for your Mac user account? (This is your login password, same one you use to unlock your screen.)"

Then use `sshpass`:
```bash
# First install sshpass in Claude's container if needed
apt-get install -y sshpass 2>/dev/null

sshpass -p '<PASSWORD>' ssh -o StrictHostKeyChecking=no \
  -p <PORT> <USERNAME>@bore.pub "echo connected"
```

**Step 3 — if neither works:**
Tell the user to verify Remote Login is on:
```
System Settings → General → Sharing → Remote Login → ON
```

---

## Full Git Workflow

### Check repo status
```bash
SSH="ssh -o StrictHostKeyChecking=no -p <PORT> <USER>@bore.pub"
$SSH "cd ~/my-project && git status && git log --oneline -10"
```

### Start fresh — clone a repo
```bash
$SSH "git clone https://github.com/user/repo.git ~/my-project"
# With a specific branch:
$SSH "git clone -b main https://github.com/user/repo.git ~/my-project"
```

### Create a new repo from scratch
```bash
$SSH "mkdir -p ~/my-project && cd ~/my-project && git init && git branch -M main"
# Create initial commit so the branch exists:
$SSH "cd ~/my-project && echo '# My Project' > README.md && git add . && git commit -m 'init'"
```

### Daily workflow — stage, commit, push
```bash
# See what changed
$SSH "cd ~/my-project && git diff --stat"

# Stage everything
$SSH "cd ~/my-project && git add -A"

# Stage specific files only
$SSH "cd ~/my-project && git add src/index.js src/utils.js"

# Commit
$SSH "cd ~/my-project && git commit -m 'feat: add login page'"

# Push to remote
$SSH "cd ~/my-project && git push origin main"
```

### Branching
```bash
# Create and switch to a new branch
$SSH "cd ~/my-project && git checkout -b feature/my-feature"

# List all branches
$SSH "cd ~/my-project && git branch -a"

# Switch branch
$SSH "cd ~/my-project && git checkout main"

# Merge a branch into main
$SSH "cd ~/my-project && git checkout main && git merge feature/my-feature"

# Delete a branch after merge
$SSH "cd ~/my-project && git branch -d feature/my-feature"
```

### Pulling & syncing
```bash
# Pull latest from remote
$SSH "cd ~/my-project && git pull origin main"

# Pull with rebase (cleaner history)
$SSH "cd ~/my-project && git pull --rebase origin main"

# Fetch without merging (just update remote refs)
$SSH "cd ~/my-project && git fetch origin"
```

### Stashing work in progress
```bash
# Stash uncommitted changes
$SSH "cd ~/my-project && git stash"

# List stashes
$SSH "cd ~/my-project && git stash list"

# Pop the latest stash
$SSH "cd ~/my-project && git stash pop"
```

### Undoing things
```bash
# Undo last commit but keep changes staged
$SSH "cd ~/my-project && git reset --soft HEAD~1"

# Undo last commit and unstage changes (keeps files)
$SSH "cd ~/my-project && git reset HEAD~1"

# Discard all local changes (careful — permanent)
$SSH "cd ~/my-project && git checkout -- ."

# Revert a specific commit (safe, creates new commit)
$SSH "cd ~/my-project && git revert <commit-hash>"
```

### Viewing history & diffs
```bash
# Pretty log
$SSH "cd ~/my-project && git log --oneline --graph --decorate -20"

# Show what changed in last commit
$SSH "cd ~/my-project && git show HEAD"

# Diff between two branches
$SSH "cd ~/my-project && git diff main..feature/my-feature"

# Who changed what line (blame)
$SSH "cd ~/my-project && git blame src/index.js"
```

### Working with remotes
```bash
# List remotes
$SSH "cd ~/my-project && git remote -v"

# Add a remote
$SSH "cd ~/my-project && git remote add origin https://github.com/user/repo.git"

# Change remote URL
$SSH "cd ~/my-project && git remote set-url origin https://github.com/user/new-repo.git"
```

### Push to GitHub (HTTPS with token)
If the user needs to push to GitHub and hasn't set up SSH keys, use a token:
> Ask the user: "Do you have a GitHub personal access token? If not, go to GitHub → Settings → Developer Settings → Personal Access Tokens → generate one with `repo` scope."

Then push with it embedded:
```bash
$SSH "cd ~/my-project && git push https://<TOKEN>@github.com/<USER>/<REPO>.git main"
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Connection refused` | Make sure bore is running on Mac and Remote Login is enabled |
| `Permission denied (publickey)` | SSH key not trusted — see Key Setup below |
| `bore not found` | Re-run the bore install command |
| Tunnel drops mid-session | User reruns `bore local 22 --to bore.pub`, pastes new port |

### Key setup (if password auth is disabled)

Claude's container generates a throwaway key per session. To pre-authorize it:

1. Claude runs: `cat ~/.ssh/id_rsa.pub` (or generates one with `ssh-keygen -t rsa -N "" -f ~/.ssh/id_rsa`)
2. User pastes the public key into their Mac's `~/.ssh/authorized_keys`

Or simpler — the user can temporarily enable password auth on their Mac:
```
System Settings → General → Sharing → Remote Login → Allow full disk access
```
Then Claude uses `sshpass` or the user can set a simple temp password.

---

## SSH key for the user (one-time identity)

The user's public key at https://sshid.io/sixscripts can be added to Claude's
authorized_keys on the Mac if they ever want Claude to push code via SSH git remotes.

---

## Session etiquette

- Always confirm the current working directory before making changes
- Show the user what command you're about to run before running it for destructive ops (deleting files, force-pushing, etc.)
- After editing a file, read it back to confirm the write succeeded
- If something fails unexpectedly, show the full error output and diagnose before retrying
