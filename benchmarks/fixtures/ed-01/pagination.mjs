export function pagination(params) {
  return {
    page: parseInt(params.get('page'), 10) || 1,
    limit: parseInt(params.get('limit'), 10) || 20,
  };
}
