export function visibleItems(state) {
  return state.items.filter(item => item.label.toLowerCase().includes(state.filter.toLowerCase()));
}

export function reduce(state, action) {
  switch (action.type) {
    case 'filter': return { ...state, filter: action.value };
    case 'select': return { ...state, selectedId: action.id };
    case 'remove': return { ...state, items: state.items.filter(item => item.id !== action.id) };
    default: return state;
  }
}
