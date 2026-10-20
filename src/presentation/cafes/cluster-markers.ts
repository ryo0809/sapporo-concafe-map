interface MapPoint<T>{item:T;group:string;x:number;y:number}

/** Preserve first matching cluster order, checking only neighbouring pixel cells. */
export function clusterMapPoints<T>(points:readonly MapPoint<T>[],radius=60):T[][]{
  type Cluster={items:T[];x:number;y:number;order:number};
  const groups=new Map<string,Cluster>(),grid=new Map<string,Cluster[]>();
  for(const point of points){
    const x=Math.floor(point.x/radius),y=Math.floor(point.y/radius);
    let match:Cluster|undefined;
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
      for(const candidate of grid.get(`${x+dx},${y+dy}`)??[]){
        if((!match||candidate.order<match.order)&&(candidate.x-point.x)**2+(candidate.y-point.y)**2<radius**2)match=candidate;
      }
    }
    match??=groups.get(point.group);
    if(match){match.items.push(point.item);continue;}
    const cluster={items:[point.item],x:point.x,y:point.y,order:groups.size};
    groups.set(point.group,cluster);
    const cell=`${x},${y}`,members=grid.get(cell)??[];members.push(cluster);grid.set(cell,members);
  }
  return [...groups.values()].map(cluster=>cluster.items);
}
