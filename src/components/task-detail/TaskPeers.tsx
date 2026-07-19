import { type Component, For } from "solid-js";
import { t } from "../../i18n";
import { formatSpeed } from "../../utils/format";
import { parsePeerId, calculatePeerProgress } from "../../utils/peer";

interface TaskPeersProps {
  peers: any[];
  numPieces?: number;
}

export const TaskPeers: Component<TaskPeersProps> = (props) => {
  return (
    <div class="card bg-base-200/30 border border-base-300/60 rounded-xl overflow-hidden">
      <div class="max-h-72 overflow-y-auto">
        <table class="table w-full text-xs">
          <thead class="sticky top-0 bg-base-100 border-b border-base-200 shadow-sm z-10">
            <tr>
              <th class="text-[10px] opacity-70 font-bold py-2.5 px-4">IP:Port</th>
              <th class="text-[10px] opacity-70 font-bold py-2.5 px-4">Client</th>
              <th class="text-[10px] opacity-70 font-bold py-2.5 px-4 text-right">Speed</th>
              <th class="text-[10px] opacity-70 font-bold py-2.5 px-4 text-right">Progress</th>
            </tr>
          </thead>
          <tbody>
            <For
              each={props.peers}
              fallback={
                <tr>
                  <td colspan="4" class="text-center py-8 opacity-50 text-[11px]">
                    {t("task-detail.peers.empty")()}
                  </td>
                </tr>
              }
            >
              {(peer) => (
                <tr class="hover:bg-base-200/20 border-b border-base-200/50">
                  <td class="font-mono text-[10px] py-2.5 px-4 break-all">
                    {peer.ip}:{peer.port}
                  </td>
                  <td class="py-2.5 px-4 max-w-[90px] truncate text-[11px]" title={parsePeerId(peer.peerId)}>
                    {parsePeerId(peer.peerId)}
                  </td>
                  <td class="py-2.5 px-4 text-right text-success font-semibold text-[10px]">
                    {formatSpeed(Number(peer.downloadSpeed))}
                  </td>
                  <td class="py-2.5 px-4 text-right font-medium text-[10px]">
                    {calculatePeerProgress(peer.bitfield, props.numPieces || 0)}%
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
};
