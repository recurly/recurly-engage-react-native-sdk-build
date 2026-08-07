/* eslint-disable react-native/no-inline-styles */

import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import {
  extractModalParams,
  type PathItem,
  type PromptResult,
} from '@recurly/engage-core';
import { getImageCompositeFieldName, modalAlignment } from './utils';
import { usePrompt } from './usePrompt';
import { CloseBar, CustomButton, type ExternalStyles } from './Components';

export const PromptDialog = ({
  path,
  onEvent,
  external,
}: {
  path: PathItem;
  onEvent: (result: PromptResult) => void;
  external?: ExternalStyles;
}) => {
  const modalParams = React.useMemo(
    () =>
      extractModalParams(
        path,
        Dimensions.get('window').width,
        Dimensions.get('window').height
      ),
    [path]
  );
  const {
    modalWidth,
    modalHeight,
    modalPosition,
    button1,
    button2,
    button3,
    buttonWidth,
    buttonWidthPercent,
    buttonHeight,
    buttonBottomPadding,
    buttonBorderRadius,
    buttonBorderColor,
    buttonBorderThickness,
    animationType,
    surveySelected,
    surveyOptionsTotal,
    surveyOptionsFontSize,
    surveyOption1Label,
    surveyOption2Label,
    surveyOption3Label,
    surveyOption4Label,
    surveyOption5Label,
    surveyOption1Value,
    surveyOption2Value,
    surveyOption3Value,
    surveyOption4Value,
    surveyOption5Value,
    fillColor,
    buttonFontSize,
  } = modalParams;
  const imageFieldName = getImageCompositeFieldName();
  const {
    state: { promptMgr, buttonFont },
  } = usePrompt();

  React.useEffect(() => {
    promptMgr?.onEvent(path, 'impression', onEvent);
  }, [promptMgr]); // eslint-disable-line react-hooks/exhaustive-deps

  const getModelHeight = () => modalHeight * (Platform.isTV ? 0.75 : 1);

  const [selectedOption, setSelectedOption] = React.useState<string | null>(
    null
  );

  const surveyOptions = [
    { label: surveyOption1Label, value: surveyOption1Value },
    { label: surveyOption2Label, value: surveyOption2Value },
    { label: surveyOption3Label, value: surveyOption3Value },
    { label: surveyOption4Label, value: surveyOption4Value },
    { label: surveyOption5Label, value: surveyOption5Value },
  ].slice(0, surveyOptionsTotal);

  // @ts-ignore
  const bkImgUrl = path.actions[imageFieldName];
  return (
    <Modal
      animationType={animationType}
      transparent={true}
      visible={true}
      onRequestClose={() => promptMgr?.onEvent(path, 'dismiss', onEvent)}
    >
      <View
        // @ts-ignore
        style={{
          flex: 1,
          ...modalAlignment(modalPosition) /* position */,
        }}
      >
        <ImageBackground
          // @ts-ignore
          source={{
            uri: bkImgUrl ? bkImgUrl : path.actions.rf_settings_bg_image,
          }}
          resizeMode="stretch"
          style={{
            ...styles.modalViewRoot,
            width: modalWidth /* size */,
            height: getModelHeight(),
          }}
        >
          <CloseBar
            params={modalParams}
            close={(reason) => promptMgr?.onEvent(path, reason, onEvent)}
            external={{ closeButtonColor: '#000000', ...external }}
          />
          <View style={styles.modalContent}>
            <View style={styles.surveyContainer}>
              {surveySelected &&
                surveyOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.radioOption}
                    onPress={() => setSelectedOption(option.value)}
                  >
                    <View
                      style={{
                        ...styles.radioCircle,
                        backgroundColor: fillColor,
                      }}
                    >
                      {selectedOption === option.value && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <Text
                      style={{
                        color: fillColor,
                        fontSize: parseFloat(surveyOptionsFontSize) || 14,
                        marginLeft: 8,
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
            <View style={styles.buttonRoot}>
              {
                // @ts-ignore TS2769
                <View style={{ width: buttonWidthPercent ?? buttonWidth }}>
                  <CustomButton
                    title={button1.label ?? ''}
                    titleStyle={{
                      color: button1.textColor,
                      fontSize: buttonFontSize,
                      ...(buttonFont ? { fontFamily: buttonFont } : {}),
                    }}
                    borderStyle={{
                      borderRadius: buttonBorderRadius,
                      borderColor: buttonBorderColor,
                      borderWidth: buttonBorderThickness,
                      height: buttonHeight,
                      marginBottom: buttonBottomPadding,
                      backgroundColor: button1.bgColor,
                    }}
                    onPress={() =>
                      promptMgr?.onEvent(path, 'goal', onEvent, {
                        surveySelection: selectedOption,
                      })
                    }
                  />
                </View>
              }
              {button2 && (
                // @ts-ignore TS2769
                <View style={{ width: buttonWidthPercent ?? buttonWidth }}>
                  <CustomButton
                    title={button2.label ?? ''}
                    titleStyle={{
                      color: button2.textColor,
                      fontSize: buttonFontSize,
                      ...(buttonFont ? { fontFamily: buttonFont } : {}),
                    }}
                    borderStyle={{
                      borderRadius: buttonBorderRadius,
                      borderColor: buttonBorderColor,
                      borderWidth: buttonBorderThickness,
                      height: buttonHeight,
                      marginBottom: buttonBottomPadding,
                      backgroundColor: button2.bgColor,
                    }}
                    onPress={() => promptMgr?.onEvent(path, 'goal2', onEvent)}
                  />
                </View>
              )}
              {button3 && (
                // @ts-ignore TS2769
                <View style={{ width: buttonWidthPercent ?? buttonWidth }}>
                  <CustomButton
                    title={button3.label ?? ''}
                    titleStyle={{
                      color: button3.textColor,
                      fontSize: buttonFontSize,
                      ...(buttonFont ? { fontFamily: buttonFont } : {}),
                    }}
                    borderStyle={{
                      borderRadius: buttonBorderRadius,
                      borderColor: buttonBorderColor,
                      borderWidth: buttonBorderThickness,
                      height: buttonHeight,
                      marginBottom: buttonBottomPadding,
                      backgroundColor: button3.bgColor,
                    }}
                    onPress={() => promptMgr?.onEvent(path, 'decline', onEvent)}
                  />
                </View>
              )}
            </View>
          </View>
        </ImageBackground>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalViewRoot: {
    backgroundColor: 'white',
  },
  modalContent: {
    flexDirection: 'column',
    flex: 1,
  },
  surveyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: 20,
    marginTop: 80,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000',
  },
  buttonRoot: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});
