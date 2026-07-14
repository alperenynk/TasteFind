import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "../constants/colors";

const alertConfig = {
  error: {
    color: "#E53935",
    icon: "close-circle",
  },
  success: {
    color: COLORS.primary,
    icon: "checkmark-circle",
  },
  warning: {
    color: "#F59E0B",
    icon: "warning",
  },
  info: {
    color: COLORS.primary,
    icon: "information-circle",
  },
};

const CustomAlert = ({
  visible,
  title,
  message,
  type = "info",
  buttonText = "OK",
  onClose,
}) => {
  const config = alertConfig[type] || alertConfig.info;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Ionicons
            name={config.icon}
            size={56}
            color={config.color}
            style={styles.icon}
          />

          <Text style={styles.title}>{title}</Text>

          <Text style={styles.message}>{message}</Text>

          <Pressable
            style={[styles.button, { backgroundColor: config.color }]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>{buttonText}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  container: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: "center",

    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,

    elevation: 8,
  },

  icon: {
    marginBottom: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 10,
  },

  message: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },

  button: {
    alignSelf: "stretch",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CustomAlert;
