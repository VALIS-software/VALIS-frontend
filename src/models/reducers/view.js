/**
 * @file Reducer for handling view state modification actions (e.g Zoom, Pan, Scroll)
 * @author Salik Syed
 */


const view = (state = [], action) => {
  switch (action.type) {
    case 'SET_VERTICAL_ZOOM':
      // TODO
      
      return []
    case 'SET_HORIZONTAL_ZOOM':
      // TODO:
      // takes in the (region_id, track_id) and removes it from the selection
      // will remove children as well
      return []
    default:
      return state
  }
}

export default view