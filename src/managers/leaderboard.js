class LeaderboardManager {
    constructor() {
        this.ANON_KEY = "sb_publishable_5GQK7A-LKm6QyGheeqYksA_S7FnMdFd";
        this.API_URL = "https://wshazyyuenmktoxzaxmx.supabase.co/functions/v1/score_rank";
        
        this.btn = document.getElementById('leaderboardBtn');
        this.modal = document.getElementById('leaderboardModal');
        this.closeBtn = document.getElementById('closeLeaderboard');
        this.content = document.getElementById('leaderboardContent');
        this.loading = document.getElementById('leaderboardLoading');
        this.table = document.getElementById('leaderboardTable');
        this.tbody = document.getElementById('leaderboardBody');
        this.tabLeaderboard = document.getElementById('tabLeaderboard');
        this.tabGod = document.getElementById('tabGod');
        
        this.currentTab = 'leaderboard';
        this.leaderboardData = [];
        this.godLeaderboardData = [];
        
        this.bindEvents();
    }
    
    bindEvents() {
        if (!this.btn || !this.modal || !this.closeBtn || !this.content || 
            !this.loading || !this.table || !this.tbody || !this.tabLeaderboard || !this.tabGod) {
            return;
        }
        
        this.btn.addEventListener('click', () => this.open());
        this.closeBtn.addEventListener('click', () => this.close());
        this.tabLeaderboard.addEventListener('click', () => this.switchTab('leaderboard'));
        this.tabGod.addEventListener('click', () => this.switchTab('god'));
    }
    
    showLoading() {
        this.content.style.display = 'none';
        this.loading.style.display = 'flex';
    }
    
    hideLoading() {
        this.loading.style.display = 'none';
        this.content.style.display = 'block';
    }
    
    async open() {
        this.modal.style.display = 'block';
        this.showLoading();
        this.btn.disabled = true;
        
        try {
            const res = await fetch(`${this.API_URL}?limit=20`, {
                headers: {
                    Authorization: `Bearer ${this.ANON_KEY}`
                }
            });
            
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || '请求失败');
            
            this.leaderboardData = json.leaderboard || [];
            this.godLeaderboardData = json.godLeaderboard || [];
            this.currentTab = 'leaderboard';
            
            this.tabLeaderboard.classList.add('active');
            this.tabGod.classList.remove('active');
            this.updateTable(this.leaderboardData, false);
            
            this.hideLoading();
        } catch (err) {
            this.tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#ff6b6b;">加载失败：${err.message}</td></tr>`;
            this.hideLoading();
            console.error(err);
        } finally {
            this.btn.disabled = false;
        }
    }
    
    close() {
        this.modal.style.display = 'none';
    }
    
    switchTab(tab) {
        this.currentTab = tab;
        this.tabLeaderboard.classList.toggle('active', tab === 'leaderboard');
        this.tabGod.classList.toggle('active', tab === 'god');
        
        const data = tab === 'leaderboard' ? this.leaderboardData : this.godLeaderboardData;
        this.updateTable(data, tab === 'god');
    }
    
    updateTable(list, isGod) {
        this.tbody.innerHTML = '';
        this.table.className = `leaderboard-table ${isGod ? 'god-table' : ''}`;
        
        if (list.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:rgba(255,255,255,0.5);">暂无数据</td></tr>';
            return;
        }
        
        list.forEach((item, idx) => {
            const tr = document.createElement('tr');
            
            const tdRank = document.createElement('td');
            tdRank.textContent = idx + 1;
            
            const tdName = document.createElement('td');
            tdName.textContent = item.nickname;
            
            const tdScore = document.createElement('td');
            tdScore.textContent = item.score;
            
            tr.appendChild(tdRank);
            tr.appendChild(tdName);
            tr.appendChild(tdScore);
            this.tbody.appendChild(tr);
        });
    }
}

export default LeaderboardManager;