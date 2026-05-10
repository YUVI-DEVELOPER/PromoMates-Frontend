import {
  createChannel,
  deleteChannel,
  getChannels,
  updateChannel,
} from "../../../api/masterData";
import { MasterDataCrudPage } from "../../../components/master-data/MasterDataCrudPage";
import type { Channel } from "../../../types/masterData";


export function ChannelsPage() {
  return (
    <MasterDataCrudPage<Channel>
      title="Channels"
      entityLabel="Channel"
      description="Manage admin-defined communication channels."
      supportsDescription
      loadItems={getChannels}
      createItem={createChannel}
      updateItem={updateChannel}
      deleteItem={deleteChannel}
    />
  );
}
