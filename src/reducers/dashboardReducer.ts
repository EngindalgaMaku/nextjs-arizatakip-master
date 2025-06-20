/**
 * Dashboard Reducer
 * Simple reducer for dashboard state management
 */

export interface DashboardState {
  openIssuesCount: number;
  resolvedIssuesCount: number;
  usersCount: number;
  totalIssuesCount: number;
  isLoading: boolean;
  error: string | null;
}

export type DashboardAction =
  | { type: 'LOADING' }
  | { type: 'LOADED_SUCCESS'; payload: Partial<DashboardState> }
  | { type: 'LOADED_ERROR'; error: string }
  | { type: 'INCREMENT_OPEN_ISSUES' }
  | { type: 'INCREMENT_TOTAL_ISSUES' }
  | { type: 'INCREMENT_RESOLVED_ISSUES' }
  | { type: 'DECREMENT_OPEN_ISSUES' };

const initialState: DashboardState = {
  openIssuesCount: 0,
  resolvedIssuesCount: 0,
  usersCount: 0,
  totalIssuesCount: 0,
  isLoading: false,
  error: null
};

/**
 * Dashboard reducer function
 */
export default function dashboardReducer(
  state: DashboardState = initialState,
  action: DashboardAction
): DashboardState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, isLoading: true, error: null };

    case 'LOADED_SUCCESS':
      return {
        ...state,
        ...action.payload,
        isLoading: false,
        error: null
      };

    case 'LOADED_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.error
      };

    case 'INCREMENT_OPEN_ISSUES':
      return {
        ...state,
        openIssuesCount: state.openIssuesCount + 1
      };

    case 'INCREMENT_TOTAL_ISSUES':
      return {
        ...state,
        totalIssuesCount: state.totalIssuesCount + 1
      };

    case 'INCREMENT_RESOLVED_ISSUES':
      return {
        ...state,
        resolvedIssuesCount: state.resolvedIssuesCount + 1
      };

    case 'DECREMENT_OPEN_ISSUES':
      return {
        ...state,
        openIssuesCount: Math.max(0, state.openIssuesCount - 1)
      };

    default:
      return state;
  }
} 