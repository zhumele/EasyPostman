import { useState } from 'react';
import { Layout } from 'antd';
import CollectionTree from '../components/CollectionTree';
import RequestEditor from '../components/RequestEditor';
import type { CollectionNode } from '../types';

const { Sider, Content } = Layout;

export default function CollectionsPage() {
  const [selectedNode, setSelectedNode] = useState<CollectionNode | undefined>();

  const handleSelectNode = (node: CollectionNode) => {
    if (node.type === 'request') {
      setSelectedNode(node);
    }
  };

  return (
    <Layout style={{ flex: 1, overflow: 'hidden' }}>
      <Sider
        width={280}
        style={{
          background: '#fff',
          borderRight: '1px solid #e8e8e8',
          overflow: 'auto',
        }}
      >
        <CollectionTree onSelectNode={handleSelectNode} selectedNodeId={selectedNode?.id} />
      </Sider>
      <Content style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <RequestEditor request={selectedNode?.type === 'request' ? selectedNode.request : undefined} />
      </Content>
    </Layout>
  );
}
