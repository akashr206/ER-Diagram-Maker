/**
 * Converts an ER diagram to a relational schema mapping.
 * Implements standard ER to Relational mapping rules.
 * 
 * @param {Array} nodes - Array of ER diagram nodes
 * @param {Array} edges - Array of edges between nodes
 * @returns {Array} Array of table schemas
 */
export function convertERToRelational(nodes, edges) {
    const entities = nodes.filter(n => n.type === 'entity');
    const relationships = nodes.filter(n => n.type === 'relationship');
    
    // Helper to get simple attributes for an entity/relationship (excluding multivalued and derived)
    // Composite attributes should be flattened (e.g., Name -> First_Name, Last_Name)
    const getFlattenedAttributes = (parentId) => {
        const attrs = nodes.filter(n => n.type === 'attribute' && n.parentId === parentId);
        let flatAttrs = [];
        for (const attr of attrs) {
            if (attr.subtype === 'derived' || attr.subtype === 'multivalued') continue;
            
            if (attr.subtype === 'composite') {
                // Get sub-attributes
                const subAttrs = nodes.filter(n => n.type === 'attribute' && n.parentId === attr.id);
                if (subAttrs.length > 0) {
                     flatAttrs.push(...subAttrs.map(sa => ({ 
                         ...sa, 
                         isPrimary: attr.subtype === 'key' || attr.subtype === 'weak_key' 
                     })));
                } else {
                     flatAttrs.push({ 
                         ...attr, 
                         isPrimary: attr.subtype === 'key' || attr.subtype === 'weak_key' 
                     });
                }
            } else {
                flatAttrs.push({ 
                    ...attr, 
                    isPrimary: attr.subtype === 'key' || attr.subtype === 'weak_key' 
                });
            }
        }
        return flatAttrs;
    };

    const schema = {}; // Map to keep track of table IDs to their schemas

    // 1. Map Regular Entity Types
    const regularEntities = entities.filter(e => e.subtype === 'regular' || !e.subtype);
    regularEntities.forEach(entity => {
        const attrs = getFlattenedAttributes(entity.id);
        const columns = attrs.map(a => ({
            name: a.label,
            isPrimaryKey: a.isPrimary,
            isForeignKey: false,
            type: a.subtype,
            originalId: a.id
        }));
        
        schema[entity.id] = {
            id: entity.id,
            name: entity.label,
            columns: columns,
            primaryKeys: columns.filter(c => c.isPrimaryKey)
        };
    });

    // 2. Map Weak Entity Types
    const weakEntities = entities.filter(e => e.subtype === 'weak');
    weakEntities.forEach(weakEnt => {
        // Find identifying relationship (weak relationship)
        const identifyingRel = relationships.find(r => 
            r.subtype === 'weak' && 
            (r.parentId === weakEnt.id || r.parentId2 === weakEnt.id)
        );
        
        let ownerId = null;
        if (identifyingRel) {
            ownerId = identifyingRel.parentId === weakEnt.id ? identifyingRel.parentId2 : identifyingRel.parentId;
        }

        const ownerTable = ownerId ? schema[ownerId] : null;
        const ownerPKs = ownerTable ? ownerTable.primaryKeys : [];

        const attrs = getFlattenedAttributes(weakEnt.id);
        const columns = attrs.map(a => ({
            name: a.label,
            isPrimaryKey: a.isPrimary, // partial key
            isForeignKey: false,
            type: a.subtype,
            originalId: a.id
        }));

        // Add owner PKs as FKs and PKs
        ownerPKs.forEach(pk => {
            const newPk = {
                name: ownerTable.name + '_' + pk.name,
                isPrimaryKey: true,
                isForeignKey: true,
                references: { table: ownerTable.name, column: pk.name }
            };
            columns.unshift(newPk);
        });

        schema[weakEnt.id] = {
            id: weakEnt.id,
            name: weakEnt.label,
            columns: columns,
            primaryKeys: columns.filter(c => c.isPrimaryKey)
        };
    });

    // 3, 4, 5. Map Binary Relationships
    relationships.forEach(rel => {
        const ent1Id = rel.parentId;
        const ent2Id = rel.parentId2;
        
        if (!ent1Id || !ent2Id) return;

        const table1 = schema[ent1Id];
        const table2 = schema[ent2Id];
        if (!table1 || !table2) return;

        const isWeakRel = rel.subtype === 'weak';
        if (isWeakRel) {
            // Already handled as part of Weak Entity mapping
            return;
        }

        const card1 = rel.cardinality1 || '1';
        const card2 = rel.cardinality2 || 'N';

        const attrs = getFlattenedAttributes(rel.id);
        const relColumns = attrs.map(a => ({
            name: a.label,
            isPrimaryKey: false,
            isForeignKey: false,
            type: a.subtype,
            originalId: a.id
        }));

        if (card1 === '1' && card2 === '1') {
            // Map Binary 1:1 Relationships
            // If one has total participation, that one gets the foreign key.
            let targetTable = table1;
            let sourceTable = table2;

            const part1 = rel.participation1 === 'total';
            const part2 = rel.participation2 === 'total';
            
            if (part2 && !part1) {
                targetTable = table2;
                sourceTable = table1;
            }

            sourceTable.primaryKeys.forEach(pk => {
                targetTable.columns.push({
                    name: sourceTable.name + '_' + pk.name,
                    isPrimaryKey: false,
                    isForeignKey: true,
                    references: { table: sourceTable.name, column: pk.name }
                });
            });
            targetTable.columns.push(...relColumns);

        } else if ((card1 === '1' && card2 === 'N') || (card1 === 'N' && card2 === '1') || (card1 === '1' && card2 === 'M') || (card1 === 'M' && card2 === '1')) {
            // Map Binary 1:N Relationships
            const manySideTable = (card2 === 'N' || card2 === 'M') ? table2 : table1;
            const oneSideTable = (card2 === 'N' || card2 === 'M') ? table1 : table2;

            oneSideTable.primaryKeys.forEach(pk => {
                manySideTable.columns.push({
                    name: oneSideTable.name + '_' + pk.name,
                    isPrimaryKey: false,
                    isForeignKey: true,
                    references: { table: oneSideTable.name, column: pk.name }
                });
            });
            manySideTable.columns.push(...relColumns);

        } else if ((card1 === 'M' && card2 === 'N') || (card1 === 'N' && card2 === 'M') || (card1 === 'N' && card2 === 'N') || (card1 === 'M' && card2 === 'M')) {
            // Map Binary M:N Relationships
            const newTable = {
                id: rel.id,
                name: rel.label,
                columns: [],
                primaryKeys: []
            };

            // Add PKs of both tables as FK and PK
            table1.primaryKeys.forEach(pk => {
                const col = {
                    name: table1.name + '_' + pk.name,
                    isPrimaryKey: true,
                    isForeignKey: true,
                    references: { table: table1.name, column: pk.name }
                };
                newTable.columns.push(col);
                newTable.primaryKeys.push(col);
            });

            table2.primaryKeys.forEach(pk => {
                const col = {
                    name: table2.name + '_' + pk.name,
                    isPrimaryKey: true,
                    isForeignKey: true,
                    references: { table: table2.name, column: pk.name }
                };
                newTable.columns.push(col);
                newTable.primaryKeys.push(col);
            });

            newTable.columns.push(...relColumns);
            schema[rel.id] = newTable;
        }
    });

    // 6. Map Multivalued Attributes
    const allMultivalued = nodes.filter(n => n.type === 'attribute' && n.subtype === 'multivalued');
    allMultivalued.forEach(mvAttr => {
        const parentId = mvAttr.parentId;
        const parentTable = schema[parentId];
        
        // Find if this multivalued attribute belongs to a relationship which was turned into a table
        const parentTableRef = parentTable || schema[parentId]; // Schema contains all newly created tables too
        
        if (!parentTableRef) return;

        const newTable = {
            id: mvAttr.id,
            name: parentTableRef.name + '_' + mvAttr.label,
            columns: [],
            primaryKeys: []
        };

        // Add parent PKs as FK and PK
        parentTableRef.primaryKeys.forEach(pk => {
            const col = {
                name: parentTableRef.name + '_' + pk.name,
                isPrimaryKey: true,
                isForeignKey: true,
                references: { table: parentTableRef.name, column: pk.name }
            };
            newTable.columns.push(col);
            newTable.primaryKeys.push(col);
        });

        // Add the multivalued attribute itself as PK
        const attrCol = {
            name: mvAttr.label,
            isPrimaryKey: true,
            isForeignKey: false,
            type: mvAttr.subtype
        };
        newTable.columns.push(attrCol);
        newTable.primaryKeys.push(attrCol);

        schema[mvAttr.id] = newTable;
    });

    // 7. Map N-ary Relationships
    // Identify relationships with more than 2 connected entities.
    // In our system, relationships typically have parentId and parentId2. 
    // To support N-ary, one would check edges connected to the relationship node.
    const naryRelationships = relationships.filter(rel => {
        const connectedEdges = edges.filter(e => e.source === rel.id || e.target === rel.id);
        // Exclude attributes
        const connectedEntities = connectedEdges.filter(e => {
            const otherId = e.source === rel.id ? e.target : e.source;
            const otherNode = nodes.find(n => n.id === otherId);
            return otherNode && otherNode.type === 'entity';
        });
        return connectedEntities.length > 2;
    });

    naryRelationships.forEach(rel => {
        // Find all connected entities
        const connectedEdges = edges.filter(e => e.source === rel.id || e.target === rel.id);
        const connectedEntities = connectedEdges.map(e => {
            const otherId = e.source === rel.id ? e.target : e.source;
            return nodes.find(n => n.id === otherId);
        }).filter(n => n && n.type === 'entity');

        const newTable = {
            id: rel.id,
            name: rel.label,
            columns: [],
            primaryKeys: []
        };

        connectedEntities.forEach(ent => {
            const entTable = schema[ent.id];
            if (!entTable) return;
            entTable.primaryKeys.forEach(pk => {
                const col = {
                    name: entTable.name + '_' + pk.name,
                    isPrimaryKey: true,
                    isForeignKey: true,
                    references: { table: entTable.name, column: pk.name }
                };
                newTable.columns.push(col);
                newTable.primaryKeys.push(col);
            });
        });

        const attrs = getFlattenedAttributes(rel.id);
        newTable.columns.push(...attrs.map(a => ({
            name: a.label,
            isPrimaryKey: false,
            isForeignKey: false,
            type: a.subtype,
            originalId: a.id
        })));

        schema[rel.id] = newTable;
    });

    return Object.values(schema);
}
