define([
    'app/views/topology/TopologyConfig'
], (TopologyConfig) => {

    return {
        layoutNodes: function (data, max_instance) {
            let nodes = data.nodes, links = data.links;
            let block_count = {}, count = 0, visited = {}, edges = {}, block_members = {};

            function visit(node_id, root_id) {
                let sub_count = 1, node = edges[node_id], next_node;
                visited[node_id] = root_id;
                for (let index = 0; index < node.length; ++index) {
                    next_node = node[index];
                    if (visited[next_node] === undefined){
                        sub_count += visit(next_node, root_id);
                    }
                }
                return sub_count;
            }

            function reduce_links() {
                let reduced_links = [], temp_links = {}, temp_elb_links = {};

                for (let index = 0; index < links.length; ++index) {
                    let rel = links[index];
                    

                    // instance, rtb, nic need to remove unnecessary links
                    // instance and nic only exists in "source" of a "Is..." relation
                    if ((rel.source.type === "i" || rel.source.type === "nic") && rel.target.type !== "rtb") {
                        if(typeof temp_links[rel.source.id] === "undefined"){
                            temp_links[rel.source.id] = {};
                        }
                        temp_links[rel.source.id][rel.target.type] = rel;
                    }
                    // rtb may exists in "source" and "target" attributes of a "Is..." relation
                    else if(rel.source.type === "rtb" || rel.target.type === "rtb"){
                        if(rel.source.type === "rtb"){
                            if(typeof temp_links[rel.source.id] === "undefined"){
                                temp_links[rel.source.id] = {};
                            }
                            temp_links[rel.source.id][rel.target.type] = rel;
                        }
                        else{
                            if(typeof temp_links[rel.target.id] === "undefined"){
                                temp_links[rel.target.id] = {};
                            }
                            temp_links[rel.target.id][rel.source.type] = rel;
                        }
                    }
                    // acl: subnet -> vpc
                    else if (rel.source.type === "acl") {
                        temp_links[rel.source.id] = temp_links[rel.source.id] || {};
                        temp_links[rel.source.id][rel.target.type] = temp_links[rel.source.id][rel.target.type] || [];
                        temp_links[rel.source.id][rel.target.type].push(rel);
                    }
                    // elb: instance -> vpc
                    else if (rel.source.type === "elb") {
                        temp_elb_links[rel.source.id] = temp_elb_links[rel.source.id] || {};
                        temp_elb_links[rel.source.id][rel.target.type] = temp_elb_links[rel.source.id][rel.target.type] || [];
                        temp_elb_links[rel.source.id][rel.target.type].push(rel);
                    }
                    // remove link sg - nic
                    else if(rel.source.type !== "sg" || (rel.source.type === "sg" && rel.target.type !== "nic")) {
                        reduced_links.push(rel);
                    }
                }

                for (let resourceId in temp_links) {
                    let resource_type = nodes[resourceId]["resourceType"];
                    let prefix = TopologyConfig.resourceTypeToPrefix[resource_type];
                    // instance: sg, subnet -> vpc
                    //if(resourceId.indexOf("i-") === 0){
                    if(prefix == "i") {
                        if(temp_links[resourceId].subnet){
                            reduced_links.push(temp_links[resourceId].subnet);
                        }
                        else if(temp_links[resourceId].vpc){
                            reduced_links.push(temp_links[resourceId].vpc);
                        }
                        if(temp_links[resourceId].sg){
                            reduced_links.push(temp_links[resourceId].sg);
                        }
                    }
                    // rtb or nic: instance -> subnet -> vpc
                    //else if(resourceId.indexOf("rtb-") === 0 || resourceId.indexOf("eni-") === 0){
                    else if(prefix =="rtb" || prefix === "nic"){
                        if(temp_links[resourceId].i){
                            reduced_links.push(temp_links[resourceId].i);
                        }
                        else if(temp_links[resourceId].subnet){
                            reduced_links.push(temp_links[resourceId].subnet);
                        }
                        else if(temp_links[resourceId].vpc){
                            reduced_links.push(temp_links[resourceId].vpc);
                        }
                    }
                    // acl: subnet -> vpc
                    else if(resourceId.indexOf("acl-") === 0) {
                        if(temp_links[resourceId].subnet && temp_links[resourceId].subnet.length > 0) {
                            reduced_links = [...reduced_links, ...temp_links[resourceId].subnet];
                        }
                        else if(temp_links[resourceId].vpc && temp_links[resourceId].vpc.length > 0) {
                            reduced_links = [...reduced_links, ...temp_links[resourceId].vpc];
                        }
                    }
                }

                // elb: instance -> subnet -> vpc
                for (let resourceId in temp_elb_links) {
                    if (temp_elb_links[resourceId].i && temp_elb_links[resourceId].i.length > 0) {
                        reduced_links = [...reduced_links, ...temp_elb_links[resourceId].i];
                    }
                    else if (temp_elb_links[resourceId].subnet && temp_elb_links[resourceId].subnet.length > 0) {
                        reduced_links = [...reduced_links, ...temp_elb_links[resourceId].subnet];
                    }
                    else if (temp_elb_links[resourceId].vpc && temp_elb_links[resourceId].vpc.length > 0) {
                        reduced_links = [...reduced_links, ...temp_elb_links[resourceId].vpc];
                    }
                }

                data.links = links = reduced_links;
            }

            function build_node() {
                for (let index in nodes) {
                    if (nodes.hasOwnProperty(index)){
                        nodes[index].link_size = 0;
                    }
                }
                for (let index in links) {
                    if (links.hasOwnProperty(index)){
                        links[index].source.link_size++;
                        links[index].target.link_size++;
                    }
                }
            }

            function build_relations() {
                for (let index in nodes) {
                    if (nodes.hasOwnProperty(index)){
                        let id = nodes[index].id;
                        edges[id] = [];
                        visited[id] = undefined;
                        nodes[index].fields = {};
                    }
                }

                for (let index in links) {
                    if (links.hasOwnProperty(index)){
                        let rel = links[index];
                        let source = rel.source, target = rel.target;

                        if (source.fields[target.type] === undefined){
                            source.fields[target.type] = [];
                        }
                        source.fields[target.type].push(target);

                        if (target.fields[source.type] === undefined){
                            target.fields[source.type] = [];
                        }
                        target.fields[source.type].push(source);

                        edges[source.id].push(target.id);
                        edges[target.id].push(source.id);
                    }
                }
                for (let index in nodes) {
                    if (nodes.hasOwnProperty(index)){
                        let id = nodes[index].id;
                        if (visited[id] === undefined){
                            block_count[id] = visit(id, id);
                        }
                    }
                }
                block_members = {};
                for (let index in nodes) {
                    if (nodes.hasOwnProperty(index)){
                        let node = nodes[index];
                        let bid = visited[node.id];
                        if (block_members[bid] === undefined){
                            block_members[bid] = {};
                        }
                        if (block_members[bid][node.type] === undefined){
                            block_members[bid][node.type] = [];
                        }
                        block_members[bid][node.type].push(node);
                    }
                }
            }

            function build() {
                build_node();
                build_relations();
            }

            function limit_instances(max_count) {
                let remove_list = {}, new_nodes = {}, new_links = [];
                for (let index in nodes) {
                    if (nodes.hasOwnProperty(index)){
                        let node = nodes[index];
                        if (node.type !== 'vol' && node.fields.i){
                            node.childCount = node.fields.i.length;
                        }
                        if (node.fields.i && node.fields.i.length > max_count &&
                            (node.type === 'vpc' || node.type === 'subnet')) {
                            for (let i = max_count; i < node.fields.i.length; ++i) {
                                remove_list[node.fields.i[i].id] = true;
                                let vols = node.fields.i[i].fields.vol;
                                for (let vol in vols){
                                    if (typeof(vols[vol]) === 'object') {
                                        remove_list[vols[vol].id] = true;
                                    }
                                }
                            }
                        }
                    }
                }
                for (let index in nodes) {
                    if (nodes.hasOwnProperty(index)){
                        let node = nodes[index];
                        if (!remove_list[node.id]) {
                            new_nodes[node.id] = node;
                        }
                    }
                }

                for (let index in links) {
                    if (links.hasOwnProperty(index)){
                        let rel = links[index];
                        if (remove_list[rel.source.id] || remove_list[rel.target.id]){
                            continue;
                        }
                        new_links.push(rel);
                    }
                }

                data.nodes = nodes = new_nodes;
                data.links = links = new_links;
            }

            reduce_links();
            build();
            limit_instances(max_instance);
            build();


            for (let index in nodes) {
                if (nodes.hasOwnProperty(index)) {
                    let node = nodes[index];
                    node.block_count = block_count[visited[node.id]];
                }
            }

            let r = 150;
            let x = -r / 2, y = r / 2;
            let dx = 1, dy = 0, l = 1, c = 1;

            function update() {
                x += dx * r * 6;
                y += dy * r * 6;
                if (--c === 0) {
                    if (dy !== 0){
                        ++l;
                    }
                    c = l;
                    let swp = dx;
                    dx = -dy;
                    dy = swp;
                }
            }

            for (let idx in block_members) {
                if (block_members.hasOwnProperty(idx)) {
                    if (block_members[idx].vpc) {
                        let vpc = block_members[idx].vpc[0];
                        if(!vpc.x || !vpc.y){
                            vpc.x = x;
                            vpc.y = y;
                        }
                    }
                    if (block_members[idx].subnet) {
                        let subnet_len = block_members[idx].subnet.length;
                        let subnets = block_members[idx].subnet;
                        let theta_sub = 2 * Math.PI / (subnet_len + 1);
                        for (let subnet_idx = 0; subnet_idx < subnet_len; ++subnet_idx) {
                            let subnet = subnets[subnet_idx];
                            if(!subnet.x || !subnet.y){
                                subnet.x = x + 1.5 * r * Math.cos(theta_sub * subnet_idx);
                                subnet.y = y + 1.5 * r * Math.sin(theta_sub * subnet_idx);
                            }
                            if (subnet.fields && subnet.fields.nic) {
                                let nic_len = subnet.fields.nic.length;
                                let nics = subnet.fields.nic;
                                let theta_nic = theta_sub / nic_len / 2.0;
                                for (let nic_idx = 0; nic_idx < nic_len; ++nic_idx) {
                                    let nic = nics[nic_idx];
                                    if(!nic.x || !nic.y){
                                        nic.x = x + 1.75 * r * Math.cos(theta_sub * (subnet_idx - 0.25) + theta_nic * nic_idx);
                                        nic.y = y + 1.75 * r * Math.sin(theta_sub * (subnet_idx - 0.25) + theta_nic * nic_idx);
                                    }
                                }
                            }
                            if (subnet.fields && subnet.fields.i) {
                                let instance_len = subnet.fields.i.length;
                                let theta_ins = theta_sub / instance_len / 2.0;
                                for (let ins_idx = 0; ins_idx < instance_len; ++ins_idx) {
                                    let instance = subnet.fields.i[ins_idx];
                                    if(!instance.x || !instance.y){
                                        instance.x = x + r * 2 * Math.cos(theta_sub * (subnet_idx - 0.25) + theta_ins * ins_idx);
                                        instance.y = y + r * 2 * Math.sin(theta_sub * (subnet_idx - 0.25) + theta_ins * ins_idx);
                                    }
                                    if (instance.fields.vol) {
                                        let vol_len = instance.fields.vol.length;
                                        let theta_vol = theta_ins / vol_len / 2.0;
                                        for (let vol_idx = 0; vol_idx < vol_len; ++vol_idx) {
                                            let vol = instance.fields.vol[vol_idx];
                                            if(!vol.x || !vol.y){
                                                vol.x = instance.x + r * Math.cos(theta_sub * (subnet_idx - 0.25) + theta_ins * (ins_idx - 0.25) + theta_vol * vol_idx);
                                                vol.y = instance.y + r * Math.sin(theta_sub * (subnet_idx - 0.25) + theta_ins * (ins_idx - 0.25) + theta_vol * vol_idx);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (block_members[idx].sg) {
                            let sg_len = block_members[idx].sg.length;
                            let sgs = block_members[idx].sg;
                            let unused_sg = 0;
                            for (let sg_idx = 0; sg_idx < sg_len; ++sg_idx) {
                                let sg = sgs[sg_idx];
                                if (sg.link_size === 1) {
                                    ++unused_sg;
                                }
                            }
                            let sg_unused_idx = 0;
                            let sg_used_idx = 0;
                            for (let sg_idx = 0; sg_idx < sg_len; ++sg_idx) {
                                let sg = sgs[sg_idx];
                                if (sg.link_size === 1) {
                                    if(!sg.x || !sg.y){
                                        sg.x = x + 1.5 * r * Math.cos(-theta_sub) + 0.5 * r * Math.cos(2 * Math.PI / unused_sg * sg_unused_idx);
                                        sg.y = y + 1.5 * r * Math.sin(-theta_sub) + 0.5 * r * Math.sin(2 * Math.PI / unused_sg * sg_unused_idx);
                                    }
                                    ++sg_unused_idx;
                                } else {
                                    if(!sg.x || !sg.y){
                                        sg.x = x + 0.5 * r * Math.cos(2 * Math.PI / (sg_len - unused_sg) * sg_used_idx);
                                        sg.y = y + 0.5 * r * Math.sin(2 * Math.PI / (sg_len - unused_sg) * sg_used_idx);
                                    }
                                    ++sg_used_idx;
                                }
                            }
                        }
                    }
                    for (let fields in block_members[idx]) {
                        if (block_members[idx].hasOwnProperty(fields)){
                            for (let obj in block_members[idx][fields]) {
                                if (typeof(block_members[idx][fields][obj]) === 'object') {
                                    if (block_members[idx][fields][obj].x === undefined) {
                                        block_members[idx][fields][obj].x = x;
                                        block_members[idx][fields][obj].y = y;
                                    }
                                }
                            }
                        }
                    }
                    update();
                }
            }
            return {
                nodes: nodes,
                links: links,
            };
        }
    };
});
