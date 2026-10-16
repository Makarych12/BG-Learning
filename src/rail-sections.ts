export const railSections=[{id:'equipment',title:'Локомотив и оборудование'},{id:'condition',title:'Техническое состояние'},{id:'communication',title:'Рабочее общение'}] as const;
export type RailSection=typeof railSections[number]['id'];
