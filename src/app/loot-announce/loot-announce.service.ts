import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { EligibleLoot, LootGroup } from '../loot-list/models/loot.model';

@Injectable({
  providedIn: 'root',
})
export class LootAnnounceService {
  constructor() {}

  /**
   * Builds a raid-warning pastable message and writes to the clipboard.
   */
  async copyLootAnnouncement(loot: LootGroup[]) {
    if (!loot.length) {
      return;
    }
    if (!loot[0].rankings.length) {
      return;
    }
    const item = loot[0].rankings[0];
    const itemLink = `format("%s", select(2,GetItemInfo(${item.id}))).."`;
    const groups = [];
    let grpIdx = 0;
    // Build up array until we have at least 5 raiders to report
    while (this.getRankingLength(groups) < 5) {
      groups.push(loot[grpIdx]);
      grpIdx++;
    }

    let top5Msg = groups.map((g) => this.makeMessage(g)).join(' | ');

    const msg = [
      `/run SendChatMessage(`,
      itemLink + ' - ',
      ...top5Msg,
      `","RAID_WARNING")`,
    ];
    const p = await navigator.clipboard.writeText(msg.join(''));
    Swal.fire({
      position: 'top-end',
      toast: true,
      icon: 'success',
      title: 'Raid Warning Announcement Copied to Clipboard!',
      showConfirmButton: false,
      timer: 1500,
    });
    return p;
  }

  private makeMessage(group: LootGroup) {
    let msg = `${group.points} - ${group.rankings
      .map((r) => r.raiderName)
      .join('; ')}`;
      if(group.rankings.length > 1) {
        msg = `TIE: ${msg}`
      }
    return `[${msg}]`;
  }

  private getRankingLength(loot: LootGroup[]) {
    return loot.reduce((count, grp) => {
      return count + grp.rankings.length;
    }, 0);
  }
}
