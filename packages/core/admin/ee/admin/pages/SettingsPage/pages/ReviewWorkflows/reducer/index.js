import { current, produce } from 'immer';
import isEqual from 'lodash/isEqual';

import {
  ACTION_SET_WORKFLOWS,
  ACTION_DELETE_STAGE,
  ACTION_ADD_STAGE,
  ACTION_UPDATE_STAGE,
} from '../constants';

export const initialState = {
  status: 'loading',
  serverState: {
    currentWorkflow: null,
    workflows: [],
  },
  clientState: {
    currentWorkflow: { data: null, isDirty: false, hasDeletedServerStages: false },
  },
};

export function reducer(state = initialState, action) {
  return produce(state, (draft) => {
    const { payload } = action;

    switch (action.type) {
      case ACTION_SET_WORKFLOWS: {
        const { status, workflows } = payload;

        draft.status = status;

        if (workflows) {
          const defaultWorkflow = workflows[0];

          draft.serverState.workflows = workflows;
          draft.serverState.currentWorkflow = defaultWorkflow;
          draft.clientState.currentWorkflow.data = defaultWorkflow;
        }
        break;
      }

      case ACTION_DELETE_STAGE: {
        const { stageId } = payload;
        const { currentWorkflow } = state.clientState;

        draft.clientState.currentWorkflow.data.stages = currentWorkflow.data.stages.filter(
          (stage) => (stage?.id ?? stage.__temp_key__) !== stageId
        );

        if (!currentWorkflow.hasDeletedServerStages) {
          draft.clientState.currentWorkflow.hasDeletedServerStages =
            !!state.serverState.currentWorkflow.stages.find((stage) => stage.id === stageId);
        }

        break;
      }

      case ACTION_ADD_STAGE: {
        const { currentWorkflow } = state.clientState;

        if (!currentWorkflow.data) {
          draft.clientState.currentWorkflow.data = {
            stages: [],
          };
        }

        const newTempKey = getMaxTempKey(draft.clientState.currentWorkflow.data.stages);

        draft.clientState.currentWorkflow.data.stages.push({
          ...payload,
          __temp_key__: newTempKey,
        });

        break;
      }

      case ACTION_UPDATE_STAGE: {
        const { currentWorkflow } = state.clientState;
        const { stageId, ...modified } = payload;

        draft.clientState.currentWorkflow.data.stages = currentWorkflow.data.stages.map((stage) =>
          (stage.id ?? stage.__temp_key__) === stageId
            ? {
                ...stage,
                ...modified,
              }
            : stage
        );

        break;
      }

      default:
        break;
    }

    if (state.clientState.currentWorkflow.data) {
      draft.clientState.currentWorkflow.isDirty = !isEqual(
        current(draft.clientState.currentWorkflow).data,
        state.serverState.currentWorkflow
      );
    }
  });
}

/**
 * @type {(stages: Array<{id?: number; __temp_key__: number}>) => number}
 */
const getMaxTempKey = (stages = []) => {
  /**
   * We check if there are ids or __temp_key__ because you may add a stage to a list of stages
   * already in the DB, alternatively you might add multiple new stages at once.
   */
  const ids = stages.map((stage) => stage.id ?? stage.__temp_key__);

  /**
   * If there are no ids it will return 0 as the max value
   * because the max value is -1.
   */
  return Math.max(...ids, -1) + 1;
};
