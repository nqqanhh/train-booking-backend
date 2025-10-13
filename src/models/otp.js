export default (sequelize, DataTypes) => {
  const Otp = sequelize.define(
    "Otp",
    {
      email: { type: DataTypes.STRING, allowNull: false },
      purpose: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "reset_password",
      },
      otp_hash: { type: DataTypes.STRING, allowNull: false },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      consumed_at: { type: DataTypes.DATE },
      attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      meta_json: { type: DataTypes.JSON },
    },
    {
      tableName: "Otps",
      underscored: true,
    }
  );

  // no associations
  return Otp;
};
